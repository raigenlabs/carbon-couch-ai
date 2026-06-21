import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API Status indicator
app.get("/api/status", (req, res) => {
  res.json({
    aiActive: !!process.env.GEMINI_API_KEY,
    hasKey: !!process.env.GEMINI_API_KEY
  });
});

// Base calculation fallback functions (highly realistic for Indian lifestyle)
function calculateLocalCarbon(data: {
  km: number;
  transport_mode: string;
  units: number;
  ac_hours: number;
  diet_type: string;
  nonveg_meals: number;
  shopping_level: string;
  location: string;
}) {
  const dailyDist = Math.max(0, Number(data.km) || 0);
  const daysPerMonth = 30;
  let transportFactor = 0;
  switch (data.transport_mode) {
    case "bike": transportFactor = 0.04; break;
    case "car": transportFactor = 0.18; break;
    case "bus": transportFactor = 0.03; break;
    case "metro": transportFactor = 0.015; break;
    case "walk": transportFactor = 0; break;
    default: transportFactor = 0.04;
  }
  const transportCO2 = Math.round(dailyDist * daysPerMonth * transportFactor);

  const baseUnits = Math.max(0, Number(data.units) || 0);
  const acHours = Math.max(0, Number(data.ac_hours) || 0);
  // A typical 1.5 Ton AC consumes ~1.2 units per hour.
  const acUnitsPerMonth = acHours * daysPerMonth * 1.2;
  const totalUnits = baseUnits + acUnitsPerMonth;
  // Indian Grid average: ~0.82 kg CO2 / kWh
  const electricityCO2 = Math.round(totalUnits * 0.82);

  // Diet baseline values (Veg: low, Non-veg adds carbon per meal)
  let foodCO2 = 45;
  const mealsPerWeek = Math.max(0, Number(data.nonveg_meals) || 0);
  if (data.diet_type === "non-veg") {
    foodCO2 += Math.round(mealsPerWeek * 4.3 * 2.2);
  }

  // Lifestyle shopping carbon estimations (Low: 30, Med: 75, High: 160)
  let lifestyleCO2 = 30;
  if (data.shopping_level === "medium") {
    lifestyleCO2 = 75;
  } else if (data.shopping_level === "high") {
    lifestyleCO2 = 160;
  }

  const totalCO2 = transportCO2 + electricityCO2 + foodCO2 + lifestyleCO2;

  // Recommendations specific to inputs
  const recs: Array<{ action: string; co2_reduction: string; difficulty: string }> = [];
  if (data.transport_mode === "car" && dailyDist > 5) {
    recs.push({
      action: "Carpool or switch to Metro/Bus three times a week for daily commute",
      co2_reduction: String(Math.round(dailyDist * 12 * (0.18 - 0.03))),
      difficulty: "medium"
    });
  } else if (data.transport_mode === "bike" && dailyDist > 10) {
    recs.push({
      action: "Switch to an Electric Scooter or take Metro on smoggy days",
      co2_reduction: String(Math.round(dailyDist * 12 * 0.03)),
      difficulty: "easy"
    });
  }

  if (acHours > 2) {
    recs.push({
      action: "Set your AC temperature to 26°C instead of 21°C (saves ~18% electricity)",
      co2_reduction: String(Math.round(acUnitsPerMonth * 0.18 * 0.82)),
      difficulty: "easy"
    });
  }

  if (baseUnits > 120) {
    recs.push({
      action: "Turn off idle power sockets at the wall to prevent phantom standby power",
      co2_reduction: String(Math.round(baseUnits * 0.08 * 0.82)),
      difficulty: "easy"
    });
  }

  if (data.diet_type === "non-veg" && mealsPerWeek > 2) {
    recs.push({
      action: "Introduce 2 dedicated vegetarian or plant-based days to your weekly meal plan",
      co2_reduction: String(Math.round(2 * 4.3 * 2.2)),
      difficulty: "easy"
    });
  }

  if (data.shopping_level === "high" || data.shopping_level === "medium") {
    recs.push({
      action: "Refrain from impulse fast-fashion sales and repair shoes/clothing instead of replacing",
      co2_reduction: String(data.shopping_level === "high" ? 45 : 20),
      difficulty: "medium"
    });
  }

  // Fallback defaults to ensure exactly 5 recommendations
  const allPossibleRecs = [
    { action: "Walk or use a bicycle for small grocery trips under 2 km", co2_reduction: "12", difficulty: "easy" },
    { action: "Accumulate clothes to wash in full washing machine loads only, using cold tap water", co2_reduction: "15", difficulty: "easy" },
    { action: "Convert dry organic kitchen wastes like tea leaves and vegetable peels to home compost", co2_reduction: "20", difficulty: "medium" },
    { action: "Upgrade old ceiling fans to smart BLDC fans (reduces power consumption by 50% per fan)", co2_reduction: "25", difficulty: "medium" },
    { action: "Install water aerators on kitchen and bathroom taps to decrease pumped hot water waste", co2_reduction: "10", difficulty: "easy" }
  ];

  while (recs.length < 5 && allPossibleRecs.length > 0) {
    const defaultRec = allPossibleRecs.shift();
    if (defaultRec && !recs.some(r => r.action === defaultRec.action)) {
      recs.push(defaultRec);
    }
  }

  // Slice at exactly 5
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
  const sumRecReduction = finalRecs.reduce((sum, r) => sum + Number(r.co2_reduction), 0);
  const reductionIfImproved = sumRecReduction * 12;
  const futureIfNoChange = Math.round(yearlyEmission * 1.06); // 6% compounding growth
  const percentage_improvement = Math.round((sumRecReduction / totalCO2) * 100);

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
  if (data.transport_mode === "car") {
    transitSavings = Math.round((dailyDist * 30 / 12) * 105 * 0.25); // 25% fuel savings assuming car efficiency 12km/L & fuel price ₹105/L
  } else if (data.transport_mode === "bike") {
    transitSavings = Math.round((dailyDist * 30 / 40) * 105 * 0.25); // 25% savings, 40km/L
  }
  const powerSavings = Math.round(acUnitsPerMonth * 0.18 * 8.0 + baseUnits * 0.08 * 8.0); // assuming ₹8.0 per kWh in standard Indian tier-1 cities
  const shoppingSavings = data.shopping_level === "high" ? 1800 : (data.shopping_level === "medium" ? 800 : 0);
  const totalMoneySaved = transitSavings + powerSavings + shoppingSavings + 300; // adding food/grocery savings

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
    motivation: `By living in ${data.location || "India"}, your personal habits stand at the key junction of our sustainable future. Transitioning your lifestyle can comfortably avert ${yearlyEmission} kg of carbon yearly, while simultaneously returning ₹${totalMoneySaved} per month into your budget. This is practical micro-sustainability. Let's make today count!`
  };
}

// POST endpoint for analyzing carbon footprint
app.post("/api/analyze", async (req, res) => {
  const {
    km,
    transport_mode,
    units,
    ac_hours,
    diet_type,
    nonveg_meals,
    shopping_level,
    location
  } = req.body;

  // Sanitized data block
  const userData = {
    km: Number(km) || 0,
    transport_mode: String(transport_mode || "walk").toLowerCase(),
    units: Number(units) || 0,
    ac_hours: Number(ac_hours) || 0,
    diet_type: String(diet_type || "veg").toLowerCase(),
    nonveg_meals: Number(nonveg_meals) || 0,
    shopping_level: String(shopping_level || "low").toLowerCase(),
    location: String(location || "India")
  };

  const localResult = calculateLocalCarbon(userData);

  if (!process.env.GEMINI_API_KEY) {
    console.log("No GEMINI_API_KEY detected. Serving highly calibrated local calculation fallback.");
    return res.json({
      success: true,
      data: localResult,
      isAI: false
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const prompt = `You are an advanced AI Carbon Coach and Sustainability Analyst. Your task is to analyze user's lifestyle variables and return a highly personalized, practical carbon footprint analysis and reduction plan.

User Data:
- Daily travel distance: ${userData.km} km
- Mode of transport: ${userData.transport_mode} (bike/car/bus/metro/walk)
- Electricity usage: ${userData.units} units (kWh) / month
- AC usage: ${userData.ac_hours} hours / day
- Diet type: ${userData.diet_type}
- Non-veg meals per week: ${userData.nonveg_meals}
- Shopping behavior: ${userData.shopping_level} (low/medium/high)
- City/Country: ${userData.location}

Here is a calibrated baseline context reference computed locally:
- Calibrated total footprint is: ${localResult.carbon_footprint.total} kg CO2/month
- Transport footprint reference: ${localResult.carbon_footprint.breakdown.transport} kg CO2/month
- Electricity footprint reference: ${localResult.carbon_footprint.breakdown.electricity} kg CO2/month
- Food footprint reference: ${localResult.carbon_footprint.breakdown.food} kg CO2/month
- Lifestyle footprint reference: ${localResult.carbon_footprint.breakdown.lifestyle} kg CO2/month

Instructions:
1. Estimate total monthly carbon footprint in kg CO2 (try to align closely with the calibrated context baseline but personalize it further based on details).
2. Suggest exactly 5 highly practical actions realistic for an Indian lifestyle (cost-sensitive, highly actionable, NO luxury recommendations like buying a Tesla, prefer energy-star, public transit, habits).
3. Suggest a localized, encouraging, slightly urgent motivational message highlighting the user's specific location: ${userData.location}.
4. Return ONLY a valid JSON object matching the requested schema strictly. Do not contain any markdown styling, code block wrappers or other trailing lines. Valid JSON only!`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an elite Sustainability Advisor specializing in realistic, high-impact, cost-optimized carbon solutions for individuals living in active, developing nations like India. Provide structured JSON matching the schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            carbon_footprint: {
              type: Type.OBJECT,
              properties: {
                total: { type: Type.STRING, description: "Total monthly CO2 footprint in kg (just the number as a string, e.g. '345')" },
                breakdown: {
                  type: Type.OBJECT,
                  properties: {
                    transport: { type: Type.STRING, description: "Monthly transport CO2 in kg as a string" },
                    electricity: { type: Type.STRING, description: "Monthly electricity CO2 in kg as a string" },
                    food: { type: Type.STRING, description: "Monthly food CO2 in kg as a string" },
                    lifestyle: { type: Type.STRING, description: "Monthly lifestyle CO2 in kg as a string" }
                  },
                  required: ["transport", "electricity", "food", "lifestyle"]
                },
                top_contributors: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "List of the top 2 contributors (e.g. ['Electricity', 'Transport'])"
                },
                explanation: { type: Type.STRING, description: "Simple explanation of why these top contributors emit the most" }
              },
              required: ["total", "breakdown", "top_contributors", "explanation"]
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING, description: "Highly practical, realistic cost-sensitive action for an Indian lifestyle" },
                  co2_reduction: { type: Type.STRING, description: "CO2 reduction in kg/month as a string" },
                  difficulty: { type: Type.STRING, description: "Difficulty level exactly: 'easy', 'medium', or 'hard'" }
                },
                required: ["action", "co2_reduction", "difficulty"]
              },
              description: "Array of exactly 5 practical reduction recommendations"
            },
            future_prediction: {
              type: Type.OBJECT,
              properties: {
                yearly_emission: { type: Type.STRING, description: "Estimated yearly CO2 emission in kg as a string" },
                future_if_no_change: { type: Type.STRING, description: "Predicted yearly emission if no changes are made as a string" },
                reduction_if_improved: { type: Type.STRING, description: "Estimated yearly reduction if suggestions followed as a string" },
                percentage_improvement: { type: Type.STRING, description: "Percentage improvement as a string (e.g. '30')" }
              },
              required: ["yearly_emission", "future_if_no_change", "reduction_if_improved", "percentage_improvement"]
            },
            what_if: {
              type: Type.OBJECT,
              properties: {
                best_change: { type: Type.STRING, description: "Description of a single high-impact change" },
                impact: { type: Type.STRING, description: "Monthly CO2 reduced by this change in kg as a string" }
              },
              required: ["best_change", "impact"]
            },
            savings: {
              type: Type.OBJECT,
              properties: {
                money_saved: { type: Type.STRING, description: "Approximate monthly financial savings in Indian Rupees (₹) as a string" },
                co2_saved: { type: Type.STRING, description: "Total monthly CO2 saved by following all suggestions in kg as a string" }
              },
              required: ["money_saved", "co2_saved"]
            },
            behavior_insight: {
              type: Type.OBJECT,
              properties: {
                problem_area: { type: Type.STRING, description: "User's biggest problem area" },
                quick_action: { type: Type.STRING, description: "One specific habit they can start today" }
              },
              required: ["problem_area", "quick_action"]
            },
            motivation: { type: Type.STRING, description: "A highly personalized, encouraging but urgent, non-preachy motivational message" }
          },
          required: [
            "carbon_footprint",
            "recommendations",
            "future_prediction",
            "what_if",
            "savings",
            "behavior_insight",
            "motivation"
          ]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini API");
    }

    const aiParsed = JSON.parse(text.trim());
    return res.json({
      success: true,
      data: aiParsed,
      isAI: true
    });
  } catch (error) {
    console.error("Gemini API call failed, falling back to local calculation:", error);
    return res.json({
      success: true,
      data: localResult,
      isAI: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Chat endpoint to converse with the AI Carbon Coach
app.post("/api/chat", async (req, res) => {
  const { message, history, context } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const contextStr = context ? JSON.stringify(context) : "No footprint computed yet.";

  if (!process.env.GEMINI_API_KEY) {
    const lower = message.toLowerCase();
    let reply = "Eco-Local Coach fallback: ";
    if (lower.includes("ac") || lower.includes("cool")) {
      reply += "Setting AC units to 26°C and sealing room leaks can decrease cooling bills by 18% instantly in India. Try using a ceiling fan in tandem to maximize comfort.";
    } else if (lower.includes("travel") || lower.includes("car") || lower.includes("bike") || lower.includes("km")) {
      reply += "If commuting via car, shifting to local public transits (metro/electric buses) twice weekly curtails transit emission targets by up to 25%.";
    } else if (lower.includes("food") || lower.includes("diet") || lower.includes("veg")) {
      reply += "Cutting meat consumption or introducing meatless days shifts baseline organic production demand favorably. Locally harvested foods also remove transport packaging emissions.";
    } else if (lower.includes("money") || lower.includes("rupees") || lower.includes("saving")) {
      reply += "Conserving home energy is double-rewarding. In India, tier-1 home electricity average costs are ₹7.5-9 per unit. Trimming 100 units monthly directly deposits ₹800 back into your savings.";
    } else {
      reply += "A fantastic inquiry! Small consistent daily changes — e.g. using cold-wash cycles, walking for small grocery run distances (<1.5km), and composting — are extremely reliable wins.";
    }
    return res.json({ success: true, reply, isAI: false });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const chatHistory = Array.isArray(history) ? history.map((h: any) => ({
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.content }]
    })) : [];

    const systemInstruction = `You are a highly knowledgeable, friendly, and practical AI Carbon Coach & Sustainability Analyst.
You help individual users analyze, understand, and reduce their lifestyle carbon footprints with practical, cost-aware solutions fit for Indian environments.

The user's current footprint analysis details:
${contextStr}

Be conversational, highly actionable, realistic regarding budget, and concise (max 3 short sentences of text). Keep messages empowering and warm!`;

    const chatInstance = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction,
        temperature: 0.75,
      },
      history: chatHistory
    });

    const aiRes = await chatInstance.sendMessage({ message });
    return res.json({
      success: true,
      reply: aiRes.text || "Let's focus on simple daily gains to improve your sustainability impact today!",
      isAI: true
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return res.json({
      success: true,
      reply: "Connection to cloud coach failed. Quick tip: Swapping standard light bulbs to star-rated LED alternatives yields double carbon/monetary savings!",
      isAI: false
    });
  }
});

// Serve static assets or mount Vite dev middleware
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite();
