import "dotenv/config";
import { PrismaClient, Unit, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

console.log("DATABASE_URL in seed.ts:", process.env.DATABASE_URL);

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.inventory.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.quotationItem.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});

  // Hash passwords
  const passwordHash = await bcrypt.hash("12345", 10);

  // Create Users
  const admin = await prisma.user.create({
    data: {
      email: "vanshika80910@gmail.com",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const seller = await prisma.user.create({
    data: {
      email: "seller@aasa.com",
      passwordHash,
      role: Role.SELLER,
    },
  });

  console.log(`Created users: Admin (${admin.email}), Seller (${seller.email})`);

  // Create Products & Inventory
  const productsData = [
    {
      name: "Aspirin (API)",
      sku: "ASP-001",
      category: "API",
      description: "Active pharmaceutical ingredient - Acetylsalicylic acid powder",
      baseUnit: Unit.GRAM,
      basePriceInr: 0.50,
      initialStock: 50000.0,
      casNumber: "71-36-3",
      minReorderPoint: 1000,
      maxCapacity: 100000,
      hazardous: false,
      temperatureSensitive: false,
      trackBatch: false,
      imageUrl: "https://example.com/images/aspirin.jpg",
    },
    {
      name: "Ethanol 99%",
      sku: "ETH-002",
      category: "Solvent",
      description: "High purity absolute ethanol solvent",
      baseUnit: Unit.LITER,
      basePriceInr: 120.00, // 120 INR per liter
      initialStock: 200.0, // 200 liters
    },
    {
      name: "Hydrochloric Acid 37%",
      sku: "HCL-003",
      category: "Acid",
      description: "Analytical grade concentrated HCl acid",
      baseUnit: Unit.MILLILITER,
      basePriceInr: 0.15, // 0.15 INR per mL (150 INR per L)
      initialStock: 100000.0, // 100,000 mL
    },
    {
      name: "Sodium Chloride (NaCl)",
      sku: "NAC-005",
      category: "Salt",
      description: "Lab grade Sodium Chloride crystalline powder",
      baseUnit: Unit.KILOGRAM,
      basePriceInr: 45.00, // 45 INR per kg
      initialStock: 10.0, // 10 kg
    },
    {
      name: "Pipette 10ml",
      sku: "PIP-004",
      category: "Labware",
      description: "Graduated glass pipette 10ml capacity",
      baseUnit: Unit.UNIT,
      basePriceInr: 350.00, // 350 INR per unit
      initialStock: 150.0, // 150 pieces
    },
  ];

  for (const item of productsData) {
    const product = await prisma.product.create({
      data: {
        name: item.name,
        sku: item.sku,
        category: item.category,
        description: item.description,
        baseUnit: item.baseUnit,
        basePriceInr: item.basePriceInr,
      },
    });

    await prisma.inventory.create({
      data: {
        productId: product.id,
        quantity: item.initialStock,
      },
    });

    console.log(`Created product ${product.name} (SKU: ${product.sku}) with ${item.initialStock} ${product.baseUnit} stock.`);
  }

  console.log("Seeding complete! 🎉");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
