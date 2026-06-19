import React, { useState, useEffect, useRef } from "react";
import {
  Leaf,
  Zap,
  Car,
  Utensils,
  ShoppingBag,
  MapPin,
  TrendingDown,
  DollarSign,
  MessageSquare,
  Send,
  Sparkles,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Info,
  Calendar,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  ShieldAlert,
  Compass,
  Bike,
  Footprints,
  Train,
  Check
} from "lucide-react";

interface Recommendation {
  action: string;
  co2_reduction: string;
  difficulty: "easy" | "medium" | "hard" | string;
}

interface CarbonAnalysis {
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

interface ChatMessage {
  role: "user" | "model" | "system";
  content: string;
}

export default function App() {
  // Input parameters
  const [location, setLocation] = useState("Mumbai, India");
  const [km, setKm] = useState(24);
  const [transportMode, setTransportMode] = useState("car");
  const [units, setUnits] = useState(180);
  const [acHours, setAcHours] = useState(5);
  const [dietType, setDietType] = useState("non-veg");
  const [nonvegMeals, setNonvegMeals] = useState(4);
  const [shoppingLevel, setShoppingLevel] = useState("medium");

  // App States
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ aiActive: boolean; hasKey: boolean }>({ aiActive: false, hasKey: false });
  const [analysis, setAnalysis] = useState<CarbonAnalysis | null>(null);
  const [committedActions, setCommittedActions] = useState<Record<number, boolean>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  
  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initial calculation & server capabilities check on mount
  useEffect(() => {
    checkApiStatus();
    submitInputs(true); // run initial evaluation quietly
  }, []);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, chatLoading]);

  const checkApiStatus = async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        setApiStatus(data);
      }
    } catch (e) {
      console.warn("Could not check server API status", e);
    }
  };

  const submitInputs = async (isQuiet = false) => {
    if (!isQuiet) setLoading(true);
    setServerError(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          km,
          transport_mode: transportMode,
          units,
          ac_hours: acHours,
          diet_type: dietType,
          nonveg_meals: dietType === "veg" ? 0 : nonvegMeals,
          shopping_level: shoppingLevel,
          location
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned error code ${response.status}`);
      }

      const payload = await response.json();
      if (payload.success && payload.data) {
        setAnalysis(payload.data);
        // Clean committed actions since suggestions may have fully changed
        setCommittedActions({});
        
        // Add initial greeting from coach matching the context if conversation is empty
        if (chatHistory.length === 0) {
          setChatHistory([
            {
              role: "model",
              content: `Hello! I'm your AI Carbon Coach. I've analyzed your profile in ${location}. Your monthly carbon emission is estimated at ${payload.data.carbon_footprint.total} kg CO₂. I've prepared a highly realistic, localized reduction blueprint for you. Ask me anything about swapping appliances, local transit options, or how to save more money!`
            }
          ]);
        }
      } else {
        throw new Error(payload.error || "Failed to analyze carbon data");
      }
    } catch (err: any) {
      console.error(err);
      setServerError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      if (!isQuiet) setLoading(false);
    }
  };

  // Chat message submit handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    
    const updatedHistory = [...chatHistory, { role: "user" as const, content: userMsg }];
    setChatHistory(updatedHistory);
    setChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: updatedHistory.slice(-8), // Keep last 8 interactions for token conservation
          context: analysis
        })
      });

      if (!response.ok) {
        throw new Error("Chat service unavailable");
      }

      const resData = await response.json();
      if (resData.success) {
        setChatHistory(prev => [...prev, { role: "model", content: resData.reply }]);
      } else {
        throw new Error(resData.error || "Could not retrieve coach advice");
      }
    } catch (err: any) {
      console.error(err);
      setChatHistory(prev => [
        ...prev,
        {
          role: "model",
          content: "I ran into a connection disturbance. Swapping high-wattage incandescent light bulbs to low-energy LED models remains an excellent instant win! What else is on your mind?"
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Helper values for displaying calculated savings dynamically based on committed checkboxes
  const getTotalCommittedReduction = () => {
    if (!analysis || !analysis.recommendations) return 0;
    let saved = 0;
    analysis.recommendations.forEach((rec, idx) => {
      if (committedActions[idx]) {
        saved += Number(rec.co2_reduction) || 0;
      }
    });
    return saved;
  };

  // Instant interactive client estimation for real-time responsiveness
  const getClientEstimation = () => {
    const dailyDist = Number(km) || 0;
    let transitF = 0.04;
    if (transportMode === "bike") transitF = 0.04;
    else if (transportMode === "car") transitF = 0.18;
    else if (transportMode === "bus") transitF = 0.03;
    else if (transportMode === "metro") transitF = 0.015;
    else if (transportMode === "walk") transitF = 0;
    const estTransport = Math.round(dailyDist * 30 * transitF);

    const baseUnits = Number(units) || 0;
    const acUnits = (Number(acHours) || 0) * 30 * 1.2;
    const estElectricity = Math.round((baseUnits + acUnits) * 0.82);

    let estFood = 45;
    if (dietType === "non-veg") {
      estFood += Math.round((Number(nonvegMeals) || 0) * 4.3 * 2.2);
    }

    let estLifestyle = 30;
    if (shoppingLevel === "medium") estLifestyle = 75;
    else if (shoppingLevel === "high") estLifestyle = 160;

    const total = estTransport + estElectricity + estFood + estLifestyle;
    return {
      total,
      transport: estTransport,
      electricity: estElectricity,
      food: estFood,
      lifestyle: estLifestyle
    };
  };

  const clientEst = getClientEstimation();

  // Active dataset for visualization (prioritize backend resolved analysis, then fallback on instant client calculations)
  const currentTotal = analysis ? Number(analysis.carbon_footprint.total) : clientEst.total;
  const breakTransport = analysis ? Number(analysis.carbon_footprint.breakdown.transport) : clientEst.transport;
  const breakElectricity = analysis ? Number(analysis.carbon_footprint.breakdown.electricity) : clientEst.electricity;
  const breakFood = analysis ? Number(analysis.carbon_footprint.breakdown.food) : clientEst.food;
  const breakLifestyle = analysis ? Number(analysis.carbon_footprint.breakdown.lifestyle) : clientEst.lifestyle;

  const totalCommittedReduction = getTotalCommittedReduction();
  const simulatedRemaining = Math.max(0, currentTotal - totalCommittedReduction);
  const targetThreshold = 250; // kg CO2 / month
  const percentOfTarget = Math.min(100, Math.round((simulatedRemaining / targetThreshold) * 100));

  return (
    <div className="min-h-screen bg-[#000000] text-[#ffffff] font-sans selection:bg-[#6ee7b7] selection:text-[#000000] flex flex-col antialiased">
      {/* Outer borders accent frame */}
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col p-4 md:p-6 lg:p-8">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 pb-5 border-b border-[#161616] gap-4" id="app-header">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#6ee7b7] animate-pulse"></span>
              <span className="text-[#6ee7b7] text-[11px] font-bold tracking-[0.2em] uppercase">Sustainability Command Center</span>
            </div>
            <h1 className="text-[28px] md:text-[36px] font-extrabold leading-none tracking-tight flex items-center gap-2">
              CARBON COACH <span className="text-[#6ee7b7] text-xl font-mono tracking-widest px-2 py-0.5 bg-[#161616] border border-[#222] rounded">AI</span>
            </h1>
          </div>
          <div className="flex gap-6 md:gap-8 flex-wrap">
            <div className="text-left">
              <p className="text-[11px] text-[#b4b4b4] uppercase tracking-wider mb-1">Coaching Environment</p>
              <p className="text-[14px] font-medium flex items-center gap-1.5 text-zinc-100">
                <MapPin className="w-3.5 h-3.5 text-[#6ee7b7]" />
                {location || "India"}
              </p>
            </div>
            <div className="text-left">
              <p className="text-[11px] text-[#b4b4b4] uppercase tracking-wider mb-1">System State</p>
              <p className="text-[14px] font-medium flex items-center gap-1.5 text-[#6ee7b7]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {apiStatus.aiActive ? "Gemini-Powered Engine" : "Eco-Calibrated Engine"}
              </p>
            </div>
          </div>
        </header>

        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          
          {/* LEFT COLUMN: CONTROL CONSOLE */}
          <aside className="lg:col-span-4 bg-[#0f0f0f] border border-[#161616] rounded-xl p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden" id="control-console">
            <div>
              <div className="flex items-center justify-between pb-3 mb-5 border-b border-white/5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white inline-flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#6ee7b7]" />
                  LIFESTYLE METRICS
                </h2>
                <div className="text-[11px] text-[#b4b4b4] bg-[#161616] px-2 py-0.5 rounded border border-white/5">
                  Live Calculator
                </div>
              </div>

              <div className="space-y-4">
                {/* 1. Country / City */}
                <div>
                  <label htmlFor="location-input" className="block text-[11px] text-[#b4b4b4] uppercase tracking-wider mb-1.5">
                    User Location (City/Country)
                  </label>
                  <div className="relative">
                    <input
                      id="location-input"
                      type="text"
                      className="w-full bg-[#161616] border border-white/10 rounded-lg py-2 pl-3 pr-8 text-xs text-white focus:outline-none focus:border-[#6ee7b7] focus:ring-1 focus:ring-[#6ee7b7] transition-all"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Pune, Maharashtra"
                    />
                  </div>
                </div>

                {/* 2. Mode of Transport */}
                <div>
                  <span className="block text-[11px] text-[#b4b4b4] uppercase tracking-wider mb-1.5">
                    Primary Transit Mode
                  </span>
                  <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="Transit Mode">
                    {[
                      { id: "walk", label: "Walk", icon: Footprints },
                      { id: "bike", label: "Bike", icon: Bike },
                      { id: "metro", label: "Metro", icon: Train },
                      { id: "bus", label: "Bus", icon: Train },
                      { id: "car", label: "Car", icon: Car }
                    ].map((item) => {
                      const IconComponent = item.icon;
                      const active = transportMode === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setTransportMode(item.id)}
                          className={`flex flex-col items-center justify-center py-2.5 rounded-lg border text-center transition-all focus:outline-none focus:ring-1 ${
                            active
                              ? "bg-[#161616] border-[#6ee7b7] text-[#6ee7b7] shadow-[0_0_12px_rgba(110,231,183,0.15)]"
                              : "bg-[#111] border-white/5 text-[#b4b4b4] hover:border-white/10"
                          }`}
                          aria-checked={active}
                          role="radio"
                        >
                          <IconComponent className={`w-4 h-4 mb-1 ${active ? "text-[#6ee7b7]" : "text-[#71717a]"}`} />
                          <span className="text-[10px] scale-95 uppercase font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Daily travel distance */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="km-range" className="text-[11px] text-[#b4b4b4] uppercase tracking-wider">
                      Daily Commute Distance
                    </label>
                    <span className="font-mono text-xs text-[#6ee7b7] font-semibold bg-[#161616] px-1.5 py-0.5 rounded">
                      {km} km
                    </span>
                  </div>
                  <input
                    id="km-range"
                    type="range"
                    min="0"
                    max="150"
                    step="5"
                    className="w-full accent-[#6ee7b7] cursor-pointer"
                    value={km}
                    onChange={(e) => setKm(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-[9px] text-[#b4b4b4]/60 mt-0.5">
                    <span>0 km</span>
                    <span>75 km</span>
                    <span>150 km</span>
                  </div>
                </div>

                {/* 4. Electricity usage */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="units-range" className="text-[11px] text-[#b4b4b4] uppercase tracking-wider">
                      Electricity Units (Monthly)
                    </label>
                    <span className="font-mono text-xs text-[#6ee7b7] font-semibold bg-[#161616] px-1.5 py-0.5 rounded">
                      {units} kWh
                    </span>
                  </div>
                  <input
                    id="units-range"
                    type="range"
                    min="0"
                    max="800"
                    step="10"
                    className="w-full accent-[#6ee7b7] cursor-pointer"
                    value={units}
                    onChange={(e) => setUnits(Number(e.target.value))}
                  />
                  <span className="text-[9px] text-zinc-500 block leading-tight mt-0.5 italic">
                    Average Indian flat consumes ~150-250 units/month.
                  </span>
                </div>

                {/* 5. AC Usage Hours */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="ac-range" className="text-[11px] text-[#b4b4b4] uppercase tracking-wider">
                      Air Conditioner (Daily)
                    </label>
                    <span className="font-mono text-xs text-[#6ee7b7] font-semibold bg-[#161616] px-1.5 py-0.5 rounded">
                      {acHours} hrs
                    </span>
                  </div>
                  <input
                    id="ac-range"
                    type="range"
                    min="0"
                    max="24"
                    className="w-full accent-[#6ee7b7] cursor-pointer"
                    value={acHours}
                    onChange={(e) => setAcHours(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-[9px] text-[#b4b4b4]/60 mt-0.5">
                    <span>0 h</span>
                    <span>12 h</span>
                    <span>24 h</span>
                  </div>
                </div>

                {/* 6. Diet Preferences */}
                <div>
                  <label htmlFor="diet-select" className="block text-[11px] text-[#b4b4b4] uppercase tracking-wider mb-1.5">
                    Primary Diet Type
                  </label>
                  <div className="grid grid-cols-2 gap-2" role="group">
                    <button
                      type="button"
                      onClick={() => setDietType("veg")}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold focus:outline-none ${
                        dietType === "veg"
                          ? "bg-emerald-950/20 text-[#6ee7b7] border-[#6ee7b7] shadow-sm"
                          : "bg-[#111] text-[#b4b4b4] border-white/5 hover:bg-[#161616]"
                      }`}
                    >
                      🌱 Vegetarian
                    </button>
                    <button
                      type="button"
                      onClick={() => setDietType("non-veg")}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold focus:outline-none ${
                        dietType === "non-veg"
                          ? "bg-rose-950/20 text-rose-300 border-rose-500/50 shadow-sm"
                          : "bg-[#111] text-[#b4b4b4] border-white/5 hover:bg-[#161616]"
                      }`}
                    >
                      🍗 Non-Vegetarian
                    </button>
                  </div>
                </div>

                {/* 7. Non-veg Meals per Week (Only visible if non-veg checked) */}
                {dietType === "non-veg" && (
                  <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-1">
                      <label htmlFor="nonveg-range" className="text-[11px] text-[#b4b4b4] uppercase tracking-wider">
                        Non-Veg Meals per Week
                      </label>
                      <span className="font-mono text-xs text-rose-300 font-semibold bg-[#161616] px-1.5 py-0.5 rounded">
                        {nonvegMeals} meals
                      </span>
                    </div>
                    <input
                      id="nonveg-range"
                      type="range"
                      min="1"
                      max="21"
                      className="w-full accent-rose-400 cursor-pointer"
                      value={nonvegMeals}
                      onChange={(e) => setNonvegMeals(Number(e.target.value))}
                    />
                  </div>
                )}

                {/* 8. Shopping tier */}
                <div>
                  <span className="block text-[11px] text-[#b4b4b4] uppercase tracking-wider mb-1.5">
                    Shopping Buy Behavior
                  </span>
                  <div className="grid grid-cols-3 gap-1.5" role="group">
                    {[
                      { id: "low", label: "Minimalist", desc: "Buy only essentials" },
                      { id: "medium", label: "Moderate", desc: "Subtle online retail" },
                      { id: "high", label: "Active", desc: "Frequent clothing/tech" }
                    ].map((item) => {
                      const active = shoppingLevel === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setShoppingLevel(item.id)}
                          className={`py-2 px-1 text-center rounded-lg border transition-all text-xs focus:ring-1 focus:outline-none ${
                            active
                              ? "bg-[#161616] border-[#6ee7b7] text-[#6ee7b7]"
                              : "bg-[#111] border-white/5 text-[#b4b4b4] hover:bg-[#161616]"
                          }`}
                          title={item.desc}
                        >
                          <div className="font-semibold">{item.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* BUTTON ACTION FOR AI DEEP ANALYSIS */}
            <div className="mt-8 pt-4 border-t border-white/5 space-y-2">
              <button
                type="button"
                onClick={() => submitInputs(false)}
                disabled={loading}
                className="w-full relative group bg-gradient-to-r from-emerald-500 to-[#6ee7b7] text-black font-extrabold text-xs uppercase tracking-wider py-3 px-4 rounded-lg shadow-lg hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6ee7b7]"
                id="btn-run-analysis"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    Synthesizing Carbon Blueprint...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 animate-pulse text-zinc-900 group-hover:rotate-12 transition-transform" />
                    Compute AI Carbon Formula
                  </>
                )}
              </button>
              <p className="text-[10px] text-zinc-500 text-center">
                Updates local statistics, carbon targets, and coaches custom algorithms instantly.
              </p>
            </div>
          </aside>

          {/* MAIN GRID REPORT AREA */}
          <div className="lg:col-span-8 flex flex-col gap-6" id="report-grid">
            
            {/* STAGE 1: METRICS DISPLAY & BREAKDOWN */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* PRIMARY CO2 GAUGE */}
              <section className="md:col-span-5 bg-[#0f0f0f] p-5 rounded-xl border border-[#161616] flex flex-col justify-between relative overflow-hidden group shadow-md" id="gauge-card">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#6ee7b7]/10 pointer-events-none rounded-full blur-[45px] transition-all group-hover:scale-125"></div>
                
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[12px] text-[#b4b4b4] uppercase tracking-[0.15em] font-medium leading-none">
                      Monthly Carbon Impact
                    </p>
                    {totalCommittedReduction > 0 && (
                      <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-medium">
                        Simulating reduction
                      </span>
                    )}
                  </div>
                  
                  {/* CO2 Indicator */}
                  <div className="mt-4 flex items-baseline gap-1" id="total-co2-display">
                    {totalCommittedReduction > 0 ? (
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[44px] md:text-[48px] font-extrabold text-emerald-400 leading-none">
                            {simulatedRemaining}
                          </span>
                          <span className="text-zinc-500 text-sm line-through font-mono">
                            {currentTotal}
                          </span>
                        </div>
                        <span className="text-emerald-300 text-[11px] font-semibold mt-1">
                          Committing is avoiding {totalCommittedReduction} kg CO₂!
                        </span>
                      </div>
                    ) : (
                      <>
                        <span className="text-[44px] md:text-[48px] font-extrabold text-white leading-none">
                          {currentTotal}
                        </span>
                        <span className="text-[14px] text-zinc-500 font-mono">kg</span>
                      </>
                    )}
                  </div>
                  
                  <p className="text-[12px] text-[#6ee7b7] font-semibold tracking-wide mt-1 uppercase">
                    kg CO₂e equivalent
                  </p>
                </div>

                {/* Progress bar to threshold limit */}
                <div className="mt-6 pt-4 border-t border-white/5">
                  <div className="w-full bg-[#161616] h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        simulatedRemaining > targetThreshold ? "bg-amber-500" : "bg-[#6ee7b7]"
                      }`}
                      style={{ width: `${Math.min(100, (simulatedRemaining / 500) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between w-full mt-2 text-[10px] text-[#b4b4b4] font-mono">
                    <span>0 kg</span>
                    <span className="relative font-bold text-amber-500">
                      Target Ceiling: {targetThreshold} kg
                    </span>
                    <span>500+ kg</span>
                  </div>
                </div>

                {/* Target context notification */}
                <div className="mt-3.5 text-[11px] text-[#a1a1aa] leading-relaxed flex items-start gap-1.5">
                  <Info className="w-4 h-4 text-[#6ee7b7] shrink-0 mt-0.5" />
                  <span>
                    {simulatedRemaining <= targetThreshold
                      ? "Excellent! Your footprint is under the sustainable individual target ceiling of 250 kg."
                      : "Heads up: Decisive actions can trim your output below the standard target threshold limit."}
                  </span>
                </div>
              </section>

              {/* HARMFUL BREAKDOWN CHART */}
              <section className="md:col-span-7 bg-[#0f0f0f] p-5 rounded-xl border border-[#161616] flex flex-col justify-between shadow-md" id="breakdown-card">
                <div>
                  <p className="text-[12px] text-[#b4b4b4] uppercase tracking-[0.15em] mb-4 font-semibold">
                    Resource Load Division
                  </p>
                  
                  <div className="space-y-3.5">
                    {/* TRANSPORT */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#b4b4b4] inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#6ee7b7]"></span>
                          Transport Commute
                        </span>
                        <span className="font-semibold text-white font-mono">{breakTransport} kg CO₂</span>
                      </div>
                      <div className="w-full bg-[#161616] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#6ee7b7] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(2, (breakTransport / currentTotal) * 100))}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* ELECTRICITY */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#b4b4b4] inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80]"></span>
                          Electricity Power
                        </span>
                        <span className="font-semibold text-white font-mono">{breakElectricity} kg CO2</span>
                      </div>
                      <div className="w-full bg-[#161616] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#4ade80] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(2, (breakElectricity / currentTotal) * 100))}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* FOOD */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#b4b4b4] inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#2dd4bf]"></span>
                          Dietary Intake
                        </span>
                        <span className="font-semibold text-white font-mono">{breakFood} kg CO2</span>
                      </div>
                      <div className="w-full bg-[#161616] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#2dd4bf] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(2, (breakFood / currentTotal) * 100))}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* LIFESTYLE */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#b4b4b4] inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#059669]"></span>
                          Lifestyle Consumption
                        </span>
                        <span className="font-semibold text-white font-mono">{breakLifestyle} kg CO2</span>
                      </div>
                      <div className="w-full bg-[#161616] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#059669] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(2, (breakLifestyle / currentTotal) * 100))}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-[#161616] rounded border-l-2 border-[#6ee7b7]">
                  <p className="text-[11px] text-[#b4b4b4] leading-relaxed">
                    <strong className="text-white">Live Analysis Context:</strong>{" "}
                    {analysis
                      ? analysis.carbon_footprint.explanation
                      : `Commuting covers ${percentOfTarget}% of the threshold. Optimize transportation or cool down less on hot days to trigger heavy cuts.`}
                  </p>
                </div>
              </section>

            </div>

            {/* STAGE 2: ACTIONABLE REDUCTION BLUEPRINT */}
            <section className="bg-[#0f0f0f] p-5 rounded-xl border border-[#161616] shadow-md" id="blueprint-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <p className="text-[12px] text-[#b4b4b4] uppercase tracking-[0.15em] font-semibold">
                    Personalized Reduction Plan
                  </p>
                  <p className="text-xs text-zinc-500">
                    Interactive list: Commit by ticking checkboxes to simulate real-time drops above.
                  </p>
                </div>
                {analysis && (
                  <span className="text-[10px] text-[#6ee7b7] bg-emerald-950/40 px-2 py-1 rounded border border-[#6ee7b7]/20 font-bold uppercase tracking-wider self-start sm:self-center">
                    Calibrated for Indian households
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {(analysis?.recommendations || []).map((rec, index) => {
                  const isCommitted = !!committedActions[index];
                  const diff = (rec.difficulty || "easy").toLowerCase();
                  return (
                    <div
                      key={index}
                      onClick={() => {
                        setCommittedActions(prev => ({
                          ...prev,
                          [index]: !prev[index]
                        }));
                      }}
                      className={`relative p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between gap-3 ${
                        isCommitted
                          ? "bg-emerald-950/20 border-[#6ee7b7]/60 shadow-[inset_0_1px_8px_rgba(110,231,183,0.1)]"
                          : "bg-[#161616] border-[#222] hover:border-zinc-700 hover:bg-[#1a1a1a]"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        {diff === "easy" || diff.includes("easy") ? (
                          <span className="text-[10px] text-[#6ee7b7] font-extrabold tracking-wider uppercase">Easy</span>
                        ) : diff === "medium" || diff.includes("medium") ? (
                          <span className="text-[10px] text-yellow-500 font-extrabold tracking-wider uppercase">Medium</span>
                        ) : (
                          <span className="text-[10px] text-rose-400 font-extrabold tracking-wider uppercase">Hard</span>
                        )}
                        
                        <div className={`w-4 border h-4 rounded-md flex items-center justify-center transition-all ${
                          isCommitted 
                            ? "bg-[#6ee7b7] border-[#6ee7b7] text-black" 
                            : "border-zinc-600 bg-transparent"
                        }`}>
                          {isCommitted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      <p className="text-[12px] font-medium leading-tight text-white mb-1">
                        {rec.action}
                      </p>

                      <div className="flex items-center gap-1 mt-auto">
                        <TrendingDown className="w-3.5 h-3.5 text-[#6ee7b7]" />
                        <span className="text-[11px] font-mono text-[#b4b4b4] font-semibold">
                          -{rec.co2_reduction} kg CO₂
                        </span>
                      </div>
                    </div>
                  );
                })}

                {(!analysis || !analysis.recommendations || analysis.recommendations.length === 0) && (
                  <div className="col-span-1 md:col-span-12 py-8 flex flex-col items-center justify-center text-center bg-[#131313] rounded-lg border border-dashed border-[#222]">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center mb-3">
                      <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                    </div>
                    <p className="text-xs text-white font-medium mb-1">Uncalculated Carbon Roadmap</p>
                    <p className="text-[11px] text-[#b4b4b4] max-w-sm px-4">
                      Tap the "Compute AI Carbon Formula" button in the metrics console on the left to synthesize your customized reduction strategy!
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* STAGE 3: SAVINGS, FORECAST & BEHAVIOR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* SAVINGS & FORECAST COL */}
              <div className="space-y-6">
                {/* FINANCIAL CARD */}
                <div className="bg-[#6ee7b7] text-black p-5 rounded-xl shadow-xl flex items-center justify-between border border-[#6ee7b7] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-black/5 rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform"></div>
                  
                  <div className="flex flex-col">
                    <p className="text-[11px] text-zinc-900 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" />
                      Estimated Financial Return
                    </p>
                    <p className="text-[28px] md:text-[32px] font-black leading-none text-zinc-950 flex items-baseline gap-1">
                      ₹{analysis ? analysis.savings.money_saved : "2,450"}
                      <span className="text-xs font-semibold opacity-80">/ mo</span>
                    </p>
                    <p className="text-[11px] text-zinc-800 font-medium mt-1 leading-normal max-w-xs">
                      Re-routing transport & dialing down standby utility loads directly yields this budget.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-extrabold uppercase bg-black text-white px-2 py-1 rounded inline-block">
                      {analysis ? analysis.savings.co2_saved : "125"} kg Saved!
                    </span>
                  </div>
                </div>

                {/* FORECAST */}
                <section className="bg-[#0f0f0f] p-5 rounded-xl border border-[#161616] shadow-md flex-1">
                  <p className="text-[12px] text-[#b4b4b4] uppercase tracking-[0.15em] mb-4 font-semibold">
                    Yearly Future Projection
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-end pb-2 border-b border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[12px] text-[#b4b4b4] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-rose-400 rounded-full inline-block"></span>
                          Status Quo Path
                        </span>
                        <span className="text-[10px] text-zinc-500">Compounding lifestyle emissions</span>
                      </div>
                      <span className="text-lg font-bold font-mono text-zinc-100">
                        {analysis ? analysis.future_prediction.future_if_no_change : "5,420"} kg
                      </span>
                    </div>

                    <div className="flex justify-between items-end pb-3">
                      <div className="flex flex-col">
                        <span className="text-[12px] text-[#6ee7b7] font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-[#6ee7b7] rounded-full inline-block"></span>
                          Optimized Path
                        </span>
                        <span className="text-[10px] text-zinc-500">Adopting suggested blueprint habits</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold font-mono text-[#6ee7b7]">
                          {analysis ? Math.max(0, Number(analysis.future_prediction.yearly_emission) - (Number(analysis.future_prediction.reduction_if_improved))) : "3,280"} kg
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#161616] h-[52px] flex items-center justify-center rounded-lg border border-dashed border-[#6ee7b7]/40 text-sm md:text-md font-bold text-[#6ee7b7] px-4">
                      <TrendingDown className="w-4 h-4 mr-2" />
                      {analysis ? analysis.future_prediction.percentage_improvement : "40"}% YEARLY EMISSION DEFLECTION
                    </div>
                  </div>
                </section>
              </div>

              {/* BEHAVIOR & MOTIVATIONAL COL */}
              <div className="space-y-6">
                {/* INSIGHT CARD */}
                <section className="bg-[#0f0f0f] p-5 rounded-xl border border-[#161616] shadow-md">
                  <p className="text-[12px] text-[#b4b4b4] uppercase tracking-[0.15em] mb-4 font-semibold">
                    Core Behavioral Loop
                  </p>
                  
                  <div className="mb-4">
                    <span className="text-[10px] bg-[#161616] px-2 py-0.5 rounded text-[#6ee7b7] uppercase font-bold tracking-wider">
                      Offender Indicator
                    </span>
                    <p className="text-[13px] mt-2 font-medium text-white leading-relaxed">
                      {analysis ? analysis.behavior_insight.problem_area : "High Carbon Intensity cooling & alone commute patterns."}
                    </p>
                  </div>
                  
                  <div className="p-3 bg-[#111] rounded-lg border border-white/5">
                    <p className="text-[11px] text-[#6ee7b7] font-bold uppercase mb-1 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                    	Action Today
                    </p>
                    <p className="text-[12px] text-zinc-300 leading-snug">
                      {analysis ? analysis.behavior_insight.quick_action : "Adjust your air-conditioning setpoint to 26°C with 'Fan' high instantly."}
                    </p>
                  </div>
                </section>

                {/* WHAT IF GAUGE */}
                <section className="bg-[#0f0f0f] p-4.5 rounded-xl border border-[#161616] shadow-md">
                  <p className="text-[11px] text-[#b4b4b4] uppercase tracking-[0.15em] mb-3 font-semibold">
                    Single Super-Impact Shift
                  </p>
                  <p className="text-[12px] text-white font-medium mb-1.5 leading-snug">
                    🌻 {analysis ? analysis.what_if.best_change : "Switching to mass/transit for office commute"}
                  </p>
                  <p className="text-[11px] text-emerald-400 font-mono font-semibold">
                    Cut alone trims up to {analysis ? analysis.what_if.impact : "58"} kg CO₂ / mo instantly!
                  </p>
                </section>

                {/* MOTIVATIONAL BOX */}
                <section className="bg-[#0f0f0f] p-5 rounded-xl border border-[#161616] shadow-md flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute bottom-[-15px] right-[-15px] opacity-[0.03] text-[#ffffff] pointer-events-none select-none font-bold text-7xl font-serif">
                    “
                  </div>
                  <p className="text-[12px] md:text-[13px] italic text-[#ffffff]/90 font-medium leading-relaxed relative">
                    "{analysis ? analysis.motivation : "Small micro-sustainable habits in tier-1 Indian centers yield critical compounding reductions. Your choices guide a heavy share."}"
                  </p>
                </section>
              </div>

            </div>

            {/* INTEGRATED CHAT TERMINAL */}
            <section className="bg-[#0f0f0f] border border-[#161616] rounded-xl overflow-hidden flex flex-col h-[380px] shadow-2xl" id="bot-section">
              <div className="bg-[#161616] px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">AI SUSTAINABILITY COACH</h3>
                    <p className="text-[10px] text-zinc-500">Ask cooking strategies, solar rooftop quotes, or appliance offsets</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setChatHistory([
                        { role: "model", content: "Chat reset. How can I help you optimize your carbon performance or lower utility cost tags today?" }
                      ]);
                    }}
                    className="text-[10px] hover:text-white text-[#b4b4b4] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-[#6ee7b7]"
                  >
                    Clear Chat
                  </button>
                  <span className="text-[11px] text-zinc-500 bg-[#111] px-2 py-0.5 rounded font-mono border border-zinc-900">
                    V3.5 FLASH
                  </span>
                </div>
              </div>

              {/* BUBBLE LIST */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 flex flex-col justify-start">
                {chatHistory.map((msg, idx) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={idx}
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs h-auto max-h-none block whitespace-normal break-words leading-relaxed ${
                        isUser
                          ? "bg-zinc-800 text-white self-end rounded-tr-none border border-zinc-700"
                          : "bg-[#161616] text-zinc-100 self-start rounded-tl-none border border-zinc-900"
                      }`}
                    >
                      {!isUser && (
                        <div className="flex items-center gap-1.5 mb-1 text-[9px] text-[#6ee7b7] font-bold tracking-wider uppercase">
                          <Leaf className="w-2.5 h-2.5" />
                          Carbon Coach
                        </div>
                      )}
                      <div>{msg.content}</div>
                    </div>
                  );
                })}

                {chatLoading && (
                  <div className="max-w-[70%] bg-[#161616] text-zinc-400 self-start rounded-xl rounded-tl-none px-4 py-3 text-xs border border-zinc-950 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#6ee7b7]" />
                    <span className="font-medium">Formulating green advice...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* INPUT BAR */}
              <form onSubmit={handleSendMessage} className="p-3 bg-[#111] border-t border-zinc-800/80 flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-[#161616] text-[#ffffff] border border-white/5 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-[#6ee7b7] placeholder-zinc-600 transition-all focus:ring-1 focus:ring-[#6ee7b7]"
                  placeholder="Ask standard swap savings, solar alternatives, or local transit advice..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="bg-[#161616] border border-[#222] hover:border-[#6ee7b7] text-[#6ee7b7] p-2.5 rounded-lg disabled:opacity-45 disabled:hover:border-transparent transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#6ee7b7]"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </section>

          </div>

        </div>

        {/* FOOTER */}
        <footer className="mt-8 pt-5 border-t border-[#161616] flex flex-col sm:flex-row justify-between items-center text-[11px] text-[#b4b4b4] font-medium uppercase tracking-[0.1em] gap-3">
          <span>&copy; {new Date().getFullYear()} ECO-ANALYTICS ENGINE & CO₂ COACH</span>
          <div className="flex gap-6">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6ee7b7] inline-block animate-ping"></span>
              DATA REFRESH: LIVE
            </span>
            <span>GRID EMISSION: 0.82 KG/KWH</span>
            <span>API STATUS: 200 OK</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
