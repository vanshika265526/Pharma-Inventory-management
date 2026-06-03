import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { convertQuantity } from "@/lib/conversion";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { quotationId } = await req.json();

    if (!quotationId) {
      return NextResponse.json({ error: "Quotation ID is required" }, { status: 400 });
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { items: { include: { product: true } } },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    if (quotation.status !== "PENDING") {
      return NextResponse.json({ error: "Quotation is already approved or processed" }, { status: 400 });
    }

    // Step 1: Validate stock for all items
    for (const item of quotation.items) {
      const inventory = await prisma.inventory.findUnique({
        where: { productId: item.productId },
      });

      if (!inventory) {
        return NextResponse.json({ error: `Inventory not found for product ${item.product.name}` }, { status: 400 });
      }

      // Convert order unit quantity to product's base unit quantity
      const orderQtyFloat = Number(item.quantity);
      const neededBaseQty = convertQuantity(orderQtyFloat, item.unit, item.product.baseUnit);
      const availableBaseQty = Number(inventory.quantity);

      if (availableBaseQty < neededBaseQty) {
        return NextResponse.json(
          { 
            error: `Insufficient stock for ${item.product.name}. Required: ${neededBaseQty} ${item.product.baseUnit}, Available: ${availableBaseQty} ${item.product.baseUnit}` 
          }, 
          { status: 400 }
        );
      }
    }

    // Step 2: Convert to order and deduct stock in transaction
    const finalOrder = await prisma.$transaction(async (tx) => {
      // 1. Create the Order
      const order = await tx.order.create({
        data: {
          userId: quotation.userId,
          status: "COMPLETED",
          totalInr: quotation.totalInr,
        },
      });

      // 2. Create Order Items & deduct inventory
      for (const item of quotation.items) {
        // Create Order Item
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit,
            priceInr: item.priceInr,
          },
        });

        // Calculate quantity to deduct in base unit
        const neededBaseQty = convertQuantity(Number(item.quantity), item.unit, item.product.baseUnit);

        // Deduct inventory
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            quantity: {
              decrement: neededBaseQty,
            },
          },
        });
      }

      // 3. Mark quotation as approved
      await tx.quotation.update({
        where: { id: quotationId },
        data: { status: "APPROVED" },
      });

      return order;
    });

    return NextResponse.json({ success: true, orderId: finalOrder.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
