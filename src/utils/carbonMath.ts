// Shared carbon calculation coefficients and math functions
// Aligned precisely between client, server, and unit tests.

export const CO2_ELECTRICITY_COEFF = 0.82; // India standard grid carbon intensity (kg CO2 / kWh)
export const CO2_AC_COEFF = 1.2; // 1.5 ton AC unit consumption in average climate (hours to units)
export const CO2_AC_UNIT_COEFF = 1.2;

export const TRAVEL_COEFFS: Record<string, number> = {
  car: 0.18,
  bike: 0.04,
  bus: 0.03,
  metro: 0.015,
  walk: 0.0,
};

export const SHOPPING_COEFFS: Record<string, number> = {
  low: 30,
  medium: 75,
  high: 160,
};

export interface CarbonInput {
  km: number | string;
  transport_mode: string;
  units: number | string;
  ac_hours: number | string;
  diet_type: string;
  nonveg_meals: number | string;
  shopping_level: string;
  location?: string;
}

export interface Recommendation {
  action: string;
  co2_reduction: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface CarbonAnalysisResult {
  carbon_footprint: {
    total: string;
    breakdown: {
      transport: string;
      electricity: string;
      food: string;
      lifestyle: string;
    };
    top_contributors: string[];
    explanation: string;
  };
  recommendations: Recommendation[];
  future_prediction: {
    yearly_emission: string;
    future_if_no_change: string;
    reduction_if_improved: string;
    percentage_improvement: string;
  };
  what_if: {
    best_change: string;
    impact: string;
  };
  savings: {
    money_saved: string;
    co2_saved: string;
  };
  behavior_insight: {
    problem_area: string;
    quick_action: string;
  };
  motivation: string;
}

/**
 * Sanitizes input numbers safely to ensure non-negative bounds
 */
export function sanitizeVal(val: number | string | undefined | null, fallback = 0): number {
  if (val === undefined || val === null) return fallback;
  const num = typeof val === "number" ? val : parseFloat(val);
  return isNaN(num) ? fallback : Math.max(0, num);
}

/**
 * Highly optimized local carbon calculation following baseline formula
 */
export function calculateLocalCarbon(data: CarbonInput): CarbonAnalysisResult {
  const dailyDist = sanitizeVal(data.km);
  const daysPerMonth = 30;

  const mode = String(data.transport_mode || "walk").toLowerCase();
  const transitFactor = TRAVEL_COEFFS[mode] !== undefined ? TRAVEL_COEFFS[mode] : 0.04;
  const transportCO2 = Math.round(dailyDist * daysPerMonth * transitFactor);

  const baseUnits = sanitizeVal(data.units);
  const acHours = sanitizeVal(data.ac_hours);
  const acUnitsPerMonth = acHours * daysPerMonth * CO2_AC_COEFF;
  const totalUnits = baseUnits + acUnitsPerMonth;
  const electricityCO2 = Math.round(totalUnits * CO2_ELECTRICITY_COEFF);

  let foodCO2 = 45; // Baseline vegetarian
  const mealsPerWeek = sanitizeVal(data.nonveg_meals);
  if (String(data.diet_type || "veg").toLowerCase() === "non-veg") {
    foodCO2 += Math.round(mealsPerWeek * 4.3 * 2.2);
  }

  const shopping = String(data.shopping_level || "low").toLowerCase();
  const lifestyleCO2 = SHOPPING_COEFFS[shopping] !== undefined ? SHOPPING_COEFFS[shopping] : 30;

  const totalCO2 = transportCO2 + electricityCO2 + foodCO2 + lifestyleCO2;

  // Generate logical custom recommendations based on the core drivers
  const recs: Recommendation[] = [];

  if (mode === "car" && dailyDist > 5) {
    recs.push({
      action: "Carpool or switch to Metro/Bus three times a week for your daily commute",
      co2_reduction: String(Math.round(dailyDist * 12 * (0.18 - 0.03))),
      difficulty: "medium"
    });
  } else if (mode === "bike" && dailyDist > 10) {
    recs.push({
      action: "Switch to an Electric Scooter or take the Metro on bad smog days",
      co2_reduction: String(Math.round(dailyDist * 12 * 0.03)),
      difficulty: "easy"
    });
  }

  if (acHours > 2) {
    recs.push({
      action: "Set your AC temperature to 26°C instead of 21°C (saves ~18% electricity)",
      co2_reduction: String(Math.round(acUnitsPerMonth * 0.18 * CO2_ELECTRICITY_COEFF)),
      difficulty: "easy"
    });
  }

  if (baseUnits > 120) {
    recs.push({
      action: "Turn off idle power sockets at the wall to prevent phantom standby power",
      co2_reduction: String(Math.round(baseUnits * 0.08 * CO2_ELECTRICITY_COEFF)),
      difficulty: "easy"
    });
  }

  if (String(data.diet_type || "veg").toLowerCase() === "non-veg" && mealsPerWeek > 2) {
    recs.push({
      action: "Introduce 2 dedicated vegetarian or plant-based days to your weekly meal plan",
      co2_reduction: String(Math.round(2 * 4.3 * 2.2)),
      difficulty: "easy"
    });
  }

  if (shopping === "high" || shopping === "medium") {
    recs.push({
      action: "Refrain from impulse fast-fashion sales and repair shoes/clothing instead of replacing",
      co2_reduction: String(shopping === "high" ? 45 : 20),
      difficulty: "medium"
    });
  }

  // Pre-configured default backup recommendations to always meet exactly 5 in length
  const defaultPool: Recommendation[] = [
    { action: "Walk or use a bicycle for small grocery trips under 2 km", co2_reduction: "12", difficulty: "easy" },
    { action: "Accumulate clothes to wash in full washing machine loads only, using cold tap water", co2_reduction: "15", difficulty: "easy" },
    { action: "Convert dry organic kitchen wastes like tea leaves and vegetable peels to home compost", co2_reduction: "20", difficulty: "medium" },
    { action: "Upgrade old ceiling fans to smart BLDC fans (reduces power consumption by 50% per fan)", co2_reduction: "25", difficulty: "medium" },
    { action: "Install water aerators on kitchen and bathroom taps to decrease pumped hot water waste", co2_reduction: "10", difficulty: "easy" }
  ];

  for (const item of defaultPool) {
    if (recs.length >= 5) break;
    if (!recs.some(r => r.action === item.action)) {
      recs.push(item);
    }
  }

  const finalRecs = recs.slice(0, 5);

  const contributors = [
    { name: "Transport", value: transportCO2 },
    { name: "Electricity", value: electricityCO2 },
    { name: "Food", value: foodCO2 },
    { name: "Lifestyle", value: lifestyleCO2 }
  ].sort((a, b) => b.value - a.value);

  const top_contributors = [contributors[0].name, contributors[1].name];
  const explanation = `Your primary carbon emissions stem from ${contributors[0].name} (${contributors[0].value} kg CO₂/mo) and ${contributors[1].name} (${contributors[1].value} kg CO₂/mo). ${
    contributors[0].name === "Electricity" ? "The grid in India relies heavily on resource-intensive coal, making home air conditioning and appliance loads a massive portion." :
    contributors[0].name === "Transport" ? "Regular motorized commuting accumulates significant combustion footprints compared to taking electric or shared public transits." :
    contributors[0].name === "Food" ? "Meals containing non-vegetarian components, poultry, or high dairy inputs carry heavier methane, feed, and distribution loads." :
    "Frequent purchases and fast-fashion shopping cycles are high in embedded manufacturing, transport, and packaging footprints."
  }`;

  const yearlyEmission = totalCO2 * 12;
  const sumRecReduction = finalRecs.reduce((sum, r) => sum + sanitizeVal(r.co2_reduction), 0);
  const reductionIfImproved = sumRecReduction * 12;
  const futureIfNoChange = Math.round(yearlyEmission * 1.06); // 6% compounding growth
  const percentage_improvement = totalCO2 > 0 ? Math.round((sumRecReduction / totalCO2) * 100) : 0;

  let bestChange = "Upgrade ceiling fans to energy-saving BLDC fans, setting AC units to 26°C";
  let bestChangeImpact = 35;
  if (transportCO2 > electricityCO2) {
    bestChange = "Carpooling or shifting directly to public transit / shared rides for 60% of transits";
    bestChangeImpact = Math.round(transportCO2 * 0.6);
  } else if (foodCO2 > electricityCO2) {
    bestChange = "Transitioning to a primarily vegetarian, seasonal diet";
    bestChangeImpact = Math.round(foodCO2 * 0.4);
  }

  // Monthly monetary calculation in Rupees
  let transitSavings = 0;
  if (mode === "car") {
    transitSavings = Math.round((dailyDist * 30 / 12) * 105 * 0.25); // 25% fuel savings assumed ₹105/L at 12km/L
  } else if (mode === "bike") {
    transitSavings = Math.round((dailyDist * 30 / 40) * 105 * 0.25); // 25% savings at 40km/L
  }
  const powerSavings = Math.round(acUnitsPerMonth * 0.18 * 8.0 + baseUnits * 0.08 * 8.0); // ₹8.0 per kWh
  const shoppingSavings = shopping === "high" ? 1800 : (shopping === "medium" ? 800 : 0);
  const totalMoneySaved = transitSavings + powerSavings + shoppingSavings + 300; // includes estimated grocery savings

  let problemArea = "Home Electricity & Cooling";
  let quickAction = "Configure your air conditioner to 26°C with 'Fan' on high (saves ₹150+ monthly instantly).";

  if (transportCO2 > electricityCO2) {
    problemArea = "Fossil-Fueled Transit Habits";
    quickAction = "Try walking or bicycling for all short-distance neighborhood errands within a 1.5 km radius.";
  } else if (foodCO2 > electricityCO2) {
    problemArea = "Dietary Carbon Intensity";
    quickAction = "Dedicate Monday as a completely vegetarian day to cut food production emissions.";
  } else if (lifestyleCO2 > foodCO2) {
    problemArea = "Fast Consumerism Cycle";
    quickAction = "Wait 48 hours before confirming non-essential online checkout baskets to reduce waste.";
  }

  const userLoc = data.location || "India";

  return {
    carbon_footprint: {
      total: String(totalCO2),
      breakdown: {
        transport: String(transportCO2),
        electricity: String(electricityCO2),
        food: String(foodCO2),
        lifestyle: String(lifestyleCO2)
      },
      top_contributors,
      explanation
    },
    recommendations: finalRecs,
    future_prediction: {
      yearly_emission: String(yearlyEmission),
      future_if_no_change: String(futureIfNoChange),
      reduction_if_improved: String(reductionIfImproved),
      percentage_improvement: String(percentage_improvement)
    },
    what_if: {
      best_change: bestChange,
      impact: String(bestChangeImpact)
    },
    savings: {
      money_saved: String(totalMoneySaved),
      co2_saved: String(sumRecReduction)
    },
    behavior_insight: {
      problem_area: problemArea,
      quick_action: quickAction
    },
    motivation: `By living in ${userLoc}, your personal habits stand at the key junction of our sustainable future. Transitioning your lifestyle can comfortably avert ${yearlyEmission} kg of carbon yearly, while simultaneously returning ₹${totalMoneySaved} per month into your budget. This is practical micro-sustainability. Let's make today count!`
  };
}
