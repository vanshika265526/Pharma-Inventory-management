import { Prisma } from "@prisma/client";

/**
 * Format numeric value or Decimal to Indian Rupee (INR) currency display.
 * e.g., 100000 -> ₹1,00,000.00
 */
export function formatInr(amount: number | string | Prisma.Decimal | undefined | null): string {
  if (amount === undefined || amount === null) return "₹0.00";
  
  let val: number;
  if (typeof amount === "number") {
    val = amount;
  } else if (typeof amount === "string") {
    val = parseFloat(amount);
  } else {
    val = amount.toNumber();
  }

  if (isNaN(val)) return "₹0.00";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(val);
}
