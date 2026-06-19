# AI Carbon Coach & Sustainability Analyst

An immersive command-center workspace designed to help users track, estimate, and reduce their lifestyle carbon footprint with highly personalized, practical, and pocket-friendly action plans. Optimized specifically for modern Indian living structures.

---

## 🌎 Chosen Vertical
**Personal Sustainability & Micro-Carbon Footprint Optimization**
This application tackles the challenge of personal ecological responsibility by translating dry scientific emission metrics into an interactive "Sustainability Command Center". It targets the intersection of personal lifestyle routines, domestic utility bills, and daily transportation habits to inspire action through dynamic simulation and financial incentives.

---

## 💡 Approach and Logic
The application utilizes a **hybrid dual-processing engine**:
1. **Local Calibrated Model (Deterministic Fallback)**: Computes deterministic baseline coordinates utilizing localized emission coefficients tailored specifically for India standard grids and averages:
   - **Electricity Grid Factor**: `0.82 kg CO₂ / kWh` (representing India's coal-heavy grid profile).
   - **Air Conditioning Loads**: Standardizes a 1.5-ton AC power demand to consume approximately `1.2 kWh (units) per hour`.
   - **Transit Mode Scales**: 
     - Private Combustion Car: `0.18 kg CO₂ / km`.
     - Motorized Two-Wheeler: `0.04 kg CO₂ / km`.
     - Public Bus (Urban): `0.03 kg CO₂ / km`.
     - Metro Transit: `0.015 kg CO₂ / km`.
     - Walking / Cycling: `0.0 kg CO₂`.
   - **Dietary Footprints**: Standard Vegetarian baseline is centered around `45 kg CO₂/month`, while Non-Vegetarian diet adds a compounding `2.2 kg CO₂` multiplied by weekly portion portions.
   - **Lifestyle Demands**: Leverages classified shopping behaviors (Minimalist: `30 kg`, Moderate: `75 kg`, Active: `160 kg CO₂/mo`).

2. **Server-Side Gemini 3.5 AI Model**: Refines raw results, offering extremely specific micro-recommendations, contextual problem area breakdowns, and personalized motivation lines via structured JSON outputs.

---

## 🛠️ How The Solution Works
1. **Interactive Dashboard**: Users adjust real-time range sliders, transit toggles, and diet configuration states in the left column.
2. **Deterministic Carbon Gauge**: The central dial reflects the computed footprint instantaneously, showing whether the user resides below the sustainable target threshold (`250 kg CO₂ / month`).
3. **Commitment Tracker (What-If Simulation)**: Checking off recommendations instantly subtracts their respective weights on the central dashboard gauge, representing real-time savings.
4. **Savings Calculator**: Links ecological metrics directly to financial returns in Rupees (₹) by mapping conserved fuel costs (at average price ₹105/L) and tier-1 domestic grid electricity charges (~₹8.0 per unit).
5. **Conversational Advisor Terminal**: An integrated, contextual Chat panel connects the user with the AI Carbon Coach. Users can ask about local appliance swaps (e.g., BLDC fans), solar rooftop estimations, or zero-waste recipes. The chat includes full conversation history handling.

---

## 🧐 Technical Assumptions Made
- **Grid Tariffs**: Electricity savings are calculated modeling a flat average consumer cost of `₹8.0 / kWh` (typical tier-1 suburban tier rates in India).
- **Vehicle Efficiencies**: Automobiles are assumed to deliver an average fuel efficiency of `12 km / Litre`, and motorbikes `40 km / Litre`, fueled at `₹105 / Litre` for calculations.
- **AC Cooling Size**: Modeling assumes a typical domestic 1.5-ton inverter air conditioner operating with normal room sealing parameters.
- **Compounding Growth**: The "Status Quo" future projection models a `6% compounding annual emission growth` to account for standard lifestyle expansion over a 12-month timeline.

---

## 🎯 Evaluation Focus Areas

### 1. Code Quality
- **Modular and Robust**: Separates server utilities into clear Express routes (`/api/analyze` and `/api/chat`) and clients into optimized state hooks.
- **Type Safety**: Fully typed with strict TS configurations. Eliminates `any` in business calculations and provides robust typing contracts for recommendations, analyses, and messages.

### 2. Security & Separation of Concerns
- **Zero API Leakage**: Highly sensitive `GEMINI_API_KEY` remains completely server-side. Browser clients interact exclusively with Express proxies.
- **Defensive Error Handling**: The application gracefully catches any API disruptions, falling back entirely onto calibrated deterministic calculations so that the UI remains premium and functional under all circumstances.

### 3. Resource Efficiency
- **State Optimization**: Avoids expensive unnecessary re-renders inside the main console.
- **Background Dev Server Bundling**: Uses direct server compilation during development to execute with high performance and minimal memory footprint inside Cloud Run containers.

### 4. Accessibility (WCAG 2.2 AA Focus)
- **High-contrast Immersive UI**: Fully compliant foreground-on-background contrast indices using deep charcoal backgrounds contrast-balanced with emerald green accents (`#6ee7b7`) and crisp whites.
- **Keyboard Friendly**: Clear target clickable elements exceed `44px` with robust `:focus-visible` styling constraints to support physical accessibility peripherals.
- **Semantic HTML**: Features explicit `id` attributes, labels, descriptive inputs, and helper landmarks.
