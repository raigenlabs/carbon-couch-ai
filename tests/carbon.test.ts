import { test, describe } from "node:test";
import assert from "node:assert";
import {
  calculateLocalCarbon,
  sanitizeVal,
  TRAVEL_COEFFS,
  SHOPPING_COEFFS,
  CO2_ELECTRICITY_COEFF,
  CO2_AC_COEFF
} from "../src/utils/carbonMath";

describe("Carbon Analytics Calculation Unit Tests", () => {
  
  test("sanitizeVal utility function bounds and fallbacks", () => {
    // Standard positive numbers
    assert.strictEqual(sanitizeVal(15), 15);
    assert.strictEqual(sanitizeVal("25.5"), 25.5);
    
    // Negative clamping bounds
    assert.strictEqual(sanitizeVal(-10), 0);
    assert.strictEqual(sanitizeVal("-456"), 0);
    
    // Fallback options
    assert.strictEqual(sanitizeVal(undefined), 0);
    assert.strictEqual(sanitizeVal(null), 0);
    assert.strictEqual(sanitizeVal("not-a-number"), 0);
    assert.strictEqual(sanitizeVal("", 10), 10);
  });

  test("Should compute zero transport carbon when walking", () => {
    const result = calculateLocalCarbon({
      km: 30, // 30 km daily
      transport_mode: "walk", // Walking
      units: 0, // Zero electricity units
      ac_hours: 0, // Zero AC hours
      diet_type: "veg", // Vegetarian
      nonveg_meals: 0, // No non-veg meals
      shopping_level: "low", // Minimalist shopping
      location: "Mumbai"
    });

    assert.strictEqual(result.carbon_footprint.breakdown.transport, "0");
    assert.strictEqual(result.carbon_footprint.breakdown.electricity, "0");
    assert.strictEqual(result.carbon_footprint.breakdown.food, "45"); // Standard baseline veg
    assert.strictEqual(result.carbon_footprint.breakdown.lifestyle, "30"); // Minimalist shopping
    assert.strictEqual(result.carbon_footprint.total, "75");
  });

  test("Should correctly compute high carbon emissions for high travelers using private car", () => {
    const result = calculateLocalCarbon({
      km: 100, // 100 km daily commute
      transport_mode: "car", // Private combustion car
      units: 200, // 200 kWh base grid units
      ac_hours: 10, // 10 hrs air conditioner daily
      diet_type: "non-veg", // Meat consumer diet
      nonveg_meals: 14, // 14 non-veg meals weekly
      shopping_level: "high", // Active online consumer shopping
      location: "Delhi"
    });

    // Car emissions: 100km * 30 days * 0.18 = 540 kg
    assert.strictEqual(result.carbon_footprint.breakdown.transport, "540");

    // Grid electricity (base 200 kWh) + AC units (10h * 30d * 1.2 = 360 kWh) = 560 kWh
    // 560 kWh * 0.82 grid coefficient = 459.2 => rounded to 459 kg
    assert.strictEqual(result.carbon_footprint.breakdown.electricity, "459");

    // Diet non-veg: baseline 45 + (14 meals * 4.3 weeks * 2.2 factor = 132.44) => 177 kg total
    assert.strictEqual(result.carbon_footprint.breakdown.food, "177");

    // High shopping lifestyle: 160 kg
    assert.strictEqual(result.carbon_footprint.breakdown.lifestyle, "160");

    // Total: 540 + 459 + 177 + 160 = 1336 kg
    assert.strictEqual(result.carbon_footprint.total, "1336");
  });

  test("Should fallback gracefully and handle negative/invalid/empty inputs safely without breaking", () => {
    const result = calculateLocalCarbon({
      km: -50, // Negative distance
      transport_mode: "invalid-mode", // Invalid mode
      units: -100, // Negative units
      ac_hours: -2, // Negative AC hours
      diet_type: "unknown-diet", // Unknown diet
      nonveg_meals: -10, // Negative meals
      shopping_level: "unknown-shopping", // Unknown shopping tier
      location: ""
    });

    // Verify properties are safe and never negative or NaN
    const transportVal = Number(result.carbon_footprint.breakdown.transport);
    const electricityVal = Number(result.carbon_footprint.breakdown.electricity);
    const foodVal = Number(result.carbon_footprint.breakdown.food);
    const lifestyleVal = Number(result.carbon_footprint.breakdown.lifestyle);
    const totalVal = Number(result.carbon_footprint.total);

    assert.ok(!isNaN(transportVal) && transportVal >= 0);
    assert.ok(!isNaN(electricityVal) && electricityVal >= 0);
    assert.ok(!isNaN(foodVal) && foodVal >= 45); // Should be baseline vegetarian 45 kg
    assert.ok(!isNaN(lifestyleVal) && lifestyleVal === 30); // Low shopping level is 30 kg fallback
    assert.ok(!isNaN(totalVal) && totalVal >= 75);
  });

  test("Should match expected standard baseline vegetarians with low shopping profile", () => {
    const result = calculateLocalCarbon({
      km: 0,
      transport_mode: "walk",
      units: 0,
      ac_hours: 0,
      diet_type: "veg",
      nonveg_meals: 0,
      shopping_level: "low",
      location: "India"
    });
    
    assert.strictEqual(result.carbon_footprint.breakdown.food, "45");
    assert.strictEqual(result.carbon_footprint.breakdown.lifestyle, "30");
  });

  test("Should compute intermediate values for moderate user profile", () => {
    const result = calculateLocalCarbon({
      km: 20, // 20km daily
      transport_mode: "metro", // Metro transit: 0.015 factor
      units: 150, // 150 kWh
      ac_hours: 3, // 3h daily AC
      diet_type: "veg",
      nonveg_meals: 0,
      shopping_level: "medium", // Moderate shopping: 75 kg
      location: "Bangalore"
    });

    // Transport: 20 * 30 * 0.015 = 9 kg
    assert.strictEqual(result.carbon_footprint.breakdown.transport, "9");

    // Power: (150 + 3 * 30 * 1.2) * 0.82 = (150 + 108) * 0.82 = 258 kWh * 0.82 = 211.56 => 212
    assert.strictEqual(result.carbon_footprint.breakdown.electricity, "212");

    // Diet: Veg baseline = 45 kg
    assert.strictEqual(result.carbon_footprint.breakdown.food, "45");

    // Lifestyle: Moderate = 75 kg
    assert.strictEqual(result.carbon_footprint.breakdown.lifestyle, "75");

    // Total: 9 + 212 + 45 + 75 = 341 kg
    assert.strictEqual(result.carbon_footprint.total, "341");
  });

  test("Should output exactly five recommendations featuring reasonable details and reduction potentials", () => {
    const result = calculateLocalCarbon({
      km: 15,
      transport_mode: "car",
      units: 200,
      ac_hours: 5,
      diet_type: "non-veg",
      nonveg_meals: 6,
      shopping_level: "medium"
    });

    assert.strictEqual(result.recommendations.length, 5);
    
    // Every recommendation must possess non-empty descriptions, valid types, and numbers
    result.recommendations.forEach((rec) => {
      assert.ok(typeof rec.action === "string" && rec.action.length > 5);
      assert.ok(!isNaN(Number(rec.co2_reduction)) && Number(rec.co2_reduction) >= 0);
      assert.ok(["easy", "medium", "hard"].includes(rec.difficulty));
    });
  });

  test("Should compute correct financial savings in INR correctly", () => {
    // Case 1: High user vs Low user
    const resultHigh = calculateLocalCarbon({
      km: 40,
      transport_mode: "car",
      units: 200,
      ac_hours: 8,
      diet_type: "non-veg",
      nonveg_meals: 10,
      shopping_level: "high"
    });

    const resultLow = calculateLocalCarbon({
      km: 0,
      transport_mode: "walk",
      units: 0,
      ac_hours: 0,
      diet_type: "veg",
      nonveg_meals: 0,
      shopping_level: "low"
    });

    const savingsHigh = Number(resultHigh.savings.money_saved);
    const savingsLow = Number(resultLow.savings.money_saved);

    assert.ok(savingsHigh > 0);
    assert.ok(savingsLow >= 300); // Baseline standard grocery savings included
    assert.ok(savingsHigh > savingsLow);
  });

  test("Should correctly designate problem area and quick action based on maximum contributors", () => {
    // Transport heavy
    const resTransport = calculateLocalCarbon({
      km: 200,
      transport_mode: "car",
      units: 0,
      ac_hours: 0,
      diet_type: "veg",
      nonveg_meals: 0,
      shopping_level: "low"
    });
    assert.strictEqual(resTransport.behavior_insight.problem_area, "Fossil-Fueled Transit Habits");

    // Electricity heavy
    const resElec = calculateLocalCarbon({
      km: 0,
      transport_mode: "walk",
      units: 500,
      ac_hours: 10,
      diet_type: "veg",
      nonveg_meals: 0,
      shopping_level: "low"
    });
    assert.strictEqual(resElec.behavior_insight.problem_area, "Home Electricity & Cooling");

    // Food heavy
    const resFood = calculateLocalCarbon({
      km: 0,
      transport_mode: "walk",
      units: 0,
      ac_hours: 0,
      diet_type: "non-veg",
      nonveg_meals: 28,
      shopping_level: "low"
    });
    assert.strictEqual(resFood.behavior_insight.problem_area, "Dietary Carbon Intensity");
  });
});
