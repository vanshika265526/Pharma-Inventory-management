import { Unit } from "@prisma/client";

// Define the dimensions for units
export type UnitDimension = "weight" | "volume" | "count";

export interface UnitInfo {
  name: string;
  symbol: string;
  dimension: UnitDimension;
  toBaseFactor: number; // multiply user unit by this factor to get base unit quantity
}

export const UNIT_DETAILS: Record<Unit, UnitInfo> = {
  [Unit.GRAM]: {
    name: "Grams",
    symbol: "g",
    dimension: "weight",
    toBaseFactor: 1.0,
  },
  [Unit.KILOGRAM]: {
    name: "Kilograms",
    symbol: "kg",
    dimension: "weight",
    toBaseFactor: 1000.0,
  },
  [Unit.MILLILITER]: {
    name: "Milliliters",
    symbol: "mL",
    dimension: "volume",
    toBaseFactor: 1.0,
  },
  [Unit.LITER]: {
    name: "Liters",
    symbol: "L",
    dimension: "volume",
    toBaseFactor: 1000.0,
  },
  [Unit.UNIT]: {
    name: "Items",
    symbol: "each",
    dimension: "count",
    toBaseFactor: 1.0,
  },
};

/**
 * Returns list of compatible units for a given base unit.
 */
export function getCompatibleUnits(baseUnit: Unit): Unit[] {
  const baseDim = UNIT_DETAILS[baseUnit].dimension;
  return (Object.keys(UNIT_DETAILS) as Unit[]).filter(
    (u) => UNIT_DETAILS[u].dimension === baseDim
  );
}

/**
 * Converts a quantity from one unit to another.
 * e.g., 2 kg to grams -> 2 * 1000 = 2000
 */
export function convertQuantity(
  quantity: number,
  fromUnit: Unit,
  toUnit: Unit
): number {
  const fromInfo = UNIT_DETAILS[fromUnit];
  const toInfo = UNIT_DETAILS[toUnit];

  if (fromInfo.dimension !== toInfo.dimension) {
    throw new Error(
      `Cannot convert between incompatible dimensions: ${fromInfo.dimension} -> ${toInfo.dimension}`
    );
  }

  // Convert to base, then to target
  const quantityInBase = quantity * fromInfo.toBaseFactor;
  return quantityInBase / toInfo.toBaseFactor;
}

/**
 * Calculates live price for a given quantity and selected unit,
 * based on base unit and base price in INR.
 * 
 * Formula:
 * price = quantity * toBaseFactor * basePriceInr
 */
export function calculateLivePrice(
  qty: number,
  selectedUnit: Unit,
  baseUnit: Unit,
  basePriceInr: number
): number {
  try {
    const qtyInBase = convertQuantity(qty, selectedUnit, baseUnit);
    return qtyInBase * basePriceInr;
  } catch (e) {
    return 0; // Incompatible dimensions
  }
}
