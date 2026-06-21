import { test, describe } from "node:test";
import assert from "node:assert";

// Mock carbon coefficients (aligned with server.ts and local engine)
const CO2_ELECTRICITY_COEFF = 0.82; // India standard grid carbon intensity
const CO2_AC_COEFF = 1.2; // 1.5 ton AC unit consumption
const TRAVEL_COEFFS: Record<string, number> = {
  car: 0.18,
  bike: 0.04,
  bus: 0.03,
  metro: 0.015,
  walk: 0.0,
};

// Helper function to calculate emissions local to test profile
function calculateCarbonFootprint(
  km: number,
  mode: string,
  units: number,
  acHours: number,
  dietType: string,
  meals: number,
  shopping: string
) {
  // Sanitize and clamp inputs to be non-negative
  const dailyDist = Math.max(0, km || 0);
  const transitMode = TRAVEL_COEFFS[mode] !== undefined ? mode : "car";
  const factor = TRAVEL_COEFFS[transitMode];
  const commuteCO2 = Math.round(dailyDist * 30 * factor);

  const baseUnits = Math.max(0, units || 0);
  const acUnits = Math.max(0, acHours || 0) * 30 * CO2_AC_COEFF;
  const powerCO2 = Math.round((baseUnits + acUnits) * CO2_ELECTRICITY_COEFF);

  let dietCO2 = 45; // Baseline veg (kg CO2/month)
  if (dietType === "non-veg") {
    dietCO2 += Math.round(Math.max(0, meals || 0) * 4.3 * 2.2);
  }

  let shoppingCO2 = 30; // Low
  if (shopping === "medium") shoppingCO2 = 75;
  else if (shopping === "high") shoppingCO2 = 160;

  const total = commuteCO2 + powerCO2 + dietCO2 + shoppingCO2;

  return {
    total,
    breakdown: {
      transport: commuteCO2,
      electricity: powerCO2,
      food: dietCO2,
      lifestyle: shoppingCO2,
    },
  };
}

describe("Carbon Analytics Calculation Unit Tests", () => {
  test("Should compute zero transport carbon when walking", () => {
    const result = calculateCarbonFootprint(
      30, // 30 km daily
      "walk", // Walking
      0, // Zero electricity units
      0, // Zero AC hours
      "veg", // Vegetarian
      0, // No non-veg meals
      "low" // Minimalist shopping
    );

    assert.strictEqual(result.breakdown.transport, 0);
    assert.strictEqual(result.breakdown.electricity, 0);
    assert.strictEqual(result.breakdown.food, 45); // Standard baseline veg
    assert.strictEqual(result.breakdown.lifestyle, 30); // Minimalist shopping
    assert.strictEqual(result.total, 75);
  });

  test("Should correctly compute high carbon emissions for high travelers using private car", () => {
    const result = calculateCarbonFootprint(
      100, // 100 km daily commute
      "car", // Private combustion car
      200, // 200 kWh base grid units
      10, // 10 hrs air conditioner daily
      "non-veg", // Meat consumer diet
      14, // 14 non-veg meals weekly
      "high" // Active online consumer shopping
    );

    // Car emissions: 100km * 30 days * 0.18 = 540 kg
    assert.strictEqual(result.breakdown.transport, 540);

    // Grid electricity (base 200 kWh) + AC units (10h * 30d * 1.2 = 360 kWh) = 560 kWh
    // 560 kWh * 0.82 grid coefficient = 459.2 => rounded to 459 kg
    assert.strictEqual(result.breakdown.electricity, 459);

    // Diet non-veg: baseline 45 + (14 meals * 4.3 weeks * 2.2 factor = 132.44) => 177 kg total
    assert.strictEqual(result.breakdown.food, 177);

    // High shopping lifestyle: 160 kg
    assert.strictEqual(result.breakdown.lifestyle, 160);

    // Total: 540 + 459 + 177 + 160 = 1336 kg
    assert.strictEqual(result.total, 1336);
  });

  test("Should fallback gracefully and handle boundary input conditions safely", () => {
    // Test negative or zero values
    const result = calculateCarbonFootprint(
      -50, // Negative distance
      "invalid-mode", // Invalid mode
      -100, // Negative units
      -2, // Negative AC hours
      "unknown-diet", // Unknown diet
      -10, // Negative meals
      "unknown-shopping" // Unknown shopping tier
    );

    // Standard fallback behavior (Math.max(0, val) or simple default boundaries)
    assert.ok(result.total >= 0, "Total carbon emissions should never be negative");
    assert.ok(result.breakdown.transport >= 0);
    assert.ok(result.breakdown.electricity >= 0);
    assert.ok(result.breakdown.food >= 0);
    assert.ok(result.breakdown.lifestyle >= 0);
  });

  test("Should match expected standard baseline vegetarians", () => {
    const result = calculateCarbonFootprint(0, "walk", 0, 0, "veg", 0, "low");
    assert.strictEqual(result.breakdown.food, 45);
    assert.strictEqual(result.breakdown.lifestyle, 30);
  });

  test("Should compute intermediate values for moderate user profile", () => {
    const result = calculateCarbonFootprint(
      20, // 20km daily
      "metro", // Metro transit: 0.015 factor
      150, // 150 kWh
      3, // 3h daily AC
      "veg",
      0,
      "medium" // Moderate shopping: 75 kg
    );

    // Transport: 20 * 30 * 0.015 = 9 kg
    assert.strictEqual(result.breakdown.transport, 9);

    // Power: (150 + 3 * 30 * 1.2) * 0.82 = (150 + 108) * 0.82 = 258 kWh * 0.82 = 211.56 => 212
    assert.strictEqual(result.breakdown.electricity, 212);

    // Diet: Veg baseline = 45 kg
    assert.strictEqual(result.breakdown.food, 45);

    // Lifestyle: Moderate = 75 kg
    assert.strictEqual(result.breakdown.lifestyle, 75);

    // Total: 9 + 212 + 45 + 75 = 341 kg
    assert.strictEqual(result.total, 341);
  });
});
