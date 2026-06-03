import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Unit } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { z } from "zod";
import { convertQuantity, UNIT_DETAILS } from "@/lib/conversion";

const quotationItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().positive("Quantity must be greater than zero"),
  unit: z.nativeEnum(Unit),
});

const quotationSchema = z.object({
  items: z.array(quotationItemSchema).min(1, "At least one item is required"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const body = await req.json();
    const result = quotationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { items } = result.data;

    // Create quotation and quotation items in a transaction
    const newQuotation = await prisma.$transaction(async (tx) => {
      let totalInr = 0;

      // 1. Temporary list to accumulate items with verified prices
      const itemsToCreate = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        // Validate unit compatibility
        const productBaseUnit = product.baseUnit;
        const productBaseDim = UNIT_DETAILS[productBaseUnit].dimension;
        const itemDim = UNIT_DETAILS[item.unit].dimension;

        if (productBaseDim !== itemDim) {
          throw new Error(`Incompatible unit ${item.unit} for base unit ${productBaseUnit}`);
        }

        // Calculate line total in base unit
        const basePrice = Number(product.basePriceInr);
        const qtyInBase = convertQuantity(item.quantity, item.unit, productBaseUnit);
        const lineTotal = qtyInBase * basePrice;

        totalInr += lineTotal;

        itemsToCreate.push({
          productId: item.productId,
          quantity: item.quantity,
          unit: item.unit,
          priceInr: basePrice, // Store snapshot base price
        });
      }

      // 2. Create the Quotation record
      const quotation = await tx.quotation.create({
        data: {
          userId,
          status: "PENDING",
          totalInr,
        },
      });

      // 3. Create QuotationItems
      for (const itemToCreate of itemsToCreate) {
        await tx.quotationItem.create({
          data: {
            quotationId: quotation.id,
            productId: itemToCreate.productId,
            quantity: itemToCreate.quantity,
            unit: itemToCreate.unit,
            priceInr: itemToCreate.priceInr,
          },
        });
      }

      return quotation;
    });

    return NextResponse.json({ success: true, quotationId: newQuotation.id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
