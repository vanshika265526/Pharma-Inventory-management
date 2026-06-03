import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role, Unit } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().optional(),
  description: z.string().optional(),
  baseUnit: z.nativeEnum(Unit),
  basePriceInr: z.number().positive("Price must be greater than zero"),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const result = updateProductSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, sku, category, description, baseUnit, basePriceInr } = result.data;

    // Check SKU uniqueness excluding current product
    const existingProduct = await prisma.product.findFirst({
      where: {
        sku,
        id: { not: id },
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: { sku: ["SKU already exists on another product"] } },
        { status: 400 }
      );
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        sku,
        category,
        description,
        baseUnit,
        basePriceInr,
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Delete product and inventory in transaction
    await prisma.$transaction(async (tx) => {
      // First delete inventory
      await tx.inventory.deleteMany({
        where: { productId: id },
      });
      // Then delete product
      await tx.product.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
