import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role, Unit } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { z } from "zod";

// Validation schema for creating a product
const createProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().optional(),
  description: z.string().optional(),
  baseUnit: z.nativeEnum(Unit),
  basePriceInr: z.number().positive("Price must be greater than zero"),
  initialStock: z.number().nonnegative("Stock cannot be negative").default(0),
  casNumber: z.string().optional(),
  minReorderPoint: z.number().nonnegative().optional(),
  maxCapacity: z.number().nonnegative().optional(),
  hazardous: z.boolean().default(false),
  temperatureSensitive: z.boolean().default(false),
  trackBatch: z.boolean().default(false),
  imageUrl: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const products = await prisma.product.findMany({
      include: {
        inventory: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = createProductSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, sku, category, description, baseUnit, basePriceInr, initialStock, casNumber, minReorderPoint, maxCapacity, hazardous, temperatureSensitive, trackBatch, imageUrl } = result.data;

    // Check SKU uniqueness
    const existingProduct = await prisma.product.findUnique({
      where: { sku },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: { sku: ["SKU already exists"] } },
        { status: 400 }
      );
    }

    // Create product and inventory in transaction
    const newProduct = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          name,
          sku,
          category,
          description,
          baseUnit,
          basePriceInr,
          casNumber,
          minReorderPoint,
          maxCapacity,
          hazardous,
          temperatureSensitive,
          trackBatch,
          imageUrl,
        },
      });

      await tx.inventory.create({
        data: {
          productId: prod.id,
          quantity: initialStock,
        },
      });

      return prod;
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
