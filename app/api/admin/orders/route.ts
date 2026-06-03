import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Get all orders with details
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { email: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true, baseUnit: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get all quotations with details
    const quotations = await prisma.quotation.findMany({
      include: {
        user: { select: { email: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true, baseUnit: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders, quotations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
