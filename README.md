# Aasa MedChem - Chemical Inventory & Order Management System

A high-precision, role-based web application for chemical inventory tracking, dynamic unit conversions, and sales order/quotation management. Built using **Next.js 14/16 (App Router)**, **Tailwind CSS**, **shadcn/ui-inspired styling**, **NextAuth.js**, and **Prisma** with a **Neon PostgreSQL** database.

---

## 🚀 Live Demo & Repository
- **Production URL**: (TBD/Deploying on Vercel)
- **Deployment Status**: Configured with Neon Serverless driver and ws for Edge functions.

---

## 🛠️ Technology Stack & Architecture

- **Frontend**: Next.js App Router (React 19), Tailwind CSS, Radix Icons, state management, and custom glassmorphic aesthetics.
- **Backend**: Next.js Route Handlers (API Endpoints), role-based middleware guards, and transaction-safe business logic.
- **Database**: Neon Serverless PostgreSQL with Prisma ORM 7.
- **Authentication**: NextAuth.js (v4) with credentials provider for role-based sessions (`ADMIN` and `SELLER`).

---

## 📊 Database Schema & Key Models

The PostgreSQL schema uses standard relationships and is optimized for chemical inventory precision:

```mermaid
erDiagram
    User ||--o{ Order : places
    User ||--o{ Quotation : requests
    Product ||--|| Inventory : tracks
    Product ||--o{ OrderItem : includes
    Product ||--o{ QuotationItem : includes
    Order ||--o{ OrderItem : details
    Quotation ||--o{ QuotationItem : details

    User {
        String id PK
        String email UNIQUE
        String passwordHash
        Role role
    }

    Product {
        String id PK
        String name
        String sku UNIQUE
        String category
        String description
        Unit baseUnit
        Decimal basePriceInr
    }

    Inventory {
        String id PK
        String productId FK
        Decimal quantity
    }

    Order {
        String id PK
        String userId FK
        DateTime createdAt
        String status
        Decimal totalInr
    }

    OrderItem {
        String id PK
        String orderId FK
        String productId FK
        Decimal quantity
        Unit unit
        Decimal priceInr
    }

    Quotation {
        String id PK
        String userId FK
        DateTime createdAt
        String status
        Decimal totalInr
    }

    QuotationItem {
        String id PK
        String quotationId FK
        String productId FK
        Decimal quantity
        Unit unit
        Decimal priceInr
    }
```

### Key Schema Decisions & Data Types
1. **Numeric Precision**:
   - Database prices and quantities use PostgreSQL **`Decimal` / `Numeric`** type.
   - High decimal precision is preserved natively without float rounding errors (perfect for micro-dosing and milligrams/milliliters tracking).
2. **Unit Enumeration (`Unit`)**:
   - `GRAM` (g)
   - `KILOGRAM` (kg)
   - `MILLILITER` (mL)
   - `LITER` (L)
   - `UNIT` (each/items)
3. **Role-Based Access Control (`Role`)**:
   - `ADMIN`: Full CRUD on products, adjust stock directly, view and approve quotations.
   - `SELLER`: Browse products, search/filter, build quotes, place quotations.

---

## ⚖️ Unit Storage & Conversion Strategy

### 1. Internal Storage Rules
To ensure data consistency and clean mathematics, **all products are stored with a single designated `baseUnit` and `basePriceInr` in the database**:
- If a chemical is priced per gram, its `baseUnit` is `GRAM`, and the stock quantity is stored in grams.
- If it is priced per liter, its `baseUnit` is `LITER`, and the stock quantity is stored in liters.

### 2. Supported Dimensions & Conversion Table
Conversions are locked within the same dimension (weight, volume, count) to prevent logical errors:

| Dimension | Unit | Symbol | Base Unit | Conversion Factor (To Base) |
| :--- | :--- | :--- | :--- | :--- |
| **Weight** | Gram | `g` | Gram | `1.0` |
| **Weight** | Kilogram | `kg` | Gram | `1000.0` |
| **Volume** | Milliliter | `mL` | Milliliter | `1.0` |
| **Volume** | Liter | `L` | Milliliter | `1000.0` |
| **Count** | Item/Count | `each` | Item/Count | `1.0` |

### 3. Price & Quantity Calculation Flow
When a Seller orders `2 kg` of a product whose base unit is `GRAM` and base price is `₹0.50/g`:
1. **Quantity Conversion**:
   $$\text{Base Qty} = \text{Order Qty} \times \text{Conversion Factor} = 2 \times 1000 = 2000 \text{ g}$$
2. **Line Total Calculation**:
   $$\text{Line Price} = \text{Base Qty} \times \text{Base Price} = 2000 \text{ g} \times ₹0.50 = ₹1,000.00$$
3. **Quotation & Order Snapshot**:
   - When a quotation is submitted, the selected unit (`KILOGRAM`), quantity (`2`), and the current base price (`0.50`) are snapshotted in the `QuotationItem` table.
4. **Stock Deduction**:
   - Upon admin approval, the quotation is converted into an order. The stock is decremented in terms of the **base unit** (subtracts `2000` from the inventory table).

---

## 🔐 Credentials & Access Roles

The following default credentials are automatically populated by the database seed script:

- **Admin Account**:
  - **Email**: `vanshika80910@gmail.com`
  - **Password**: `12345`
  - **Permissions**: CRUD products catalog, adjust inventory directly, approve quotations.
- **Seller Account**:
  - **Email**: `seller@aasa.com`
  - **Password**: `12345`
  - **Permissions**: Browse catalog, filter items, add to cart with dynamic unit conversions, submit quotations.

---

## ⚙️ Setup & Installation

### Local Development Setup

1. **Clone & Open Project**:
   ```bash
   cd inventory-app
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Setup Environment Variables**:
   Create a `.env` file in the root folder of the `inventory-app`:
   ```env
   DATABASE_URL="postgresql://neondb_owner:npg_InfZ7JibxEW1@ep-shy-math-apm337ym.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="supersecretplaceholder12345"
   ```
4. **Sync Prisma Database**:
   Generate client and push the schema directly to Neon:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. **Seed the Database**:
   Run the TypeScript seed script:
   ```bash
   npx tsx prisma/seed.ts
   ```
6. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to log in.

---

## 🚢 Vercel Deployment

This project is optimized for deployment on Vercel:

1. **Upload Code to GitHub**:
   Initialize git repository, commit, and push.
2. **Deploy on Vercel**:
   - Link the repository on the Vercel dashboard.
   - Configure the following Environment Variables in the project settings:
     - `DATABASE_URL` (Neon PostgreSQL string)
     - `NEXTAUTH_URL` (Your production Vercel deployment URL)
     - `NEXTAUTH_SECRET` (A strong random string)
3. **Build Settings**:
   - Build command: `npm run build`
   - Output directory: `.next`
