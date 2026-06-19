# 🌱 AI Carbon Coach

### Intelligent Carbon Footprint & Sustainability Assistant

---

## 📌 Chosen Vertical

**Carbon Footprint Awareness & Personal Sustainability**

This project addresses the challenge of helping individuals **understand, track, and reduce their carbon footprint** through simple actions and personalized insights.

---

## 🚀 Overview

**AI Carbon Coach** is an AI-powered sustainability assistant that transforms everyday lifestyle data into **actionable climate intelligence**.

Instead of just calculating emissions, the system:

* Identifies high-impact problem areas
* Predicts future carbon footprint
* Suggests realistic, cost-effective improvements
* Encourages long-term behavior change

👉 The goal is not just awareness—but **decision-making and action**.

---

## 💡 Approach and Logic

The system uses a **hybrid architecture** combining deterministic calculations with AI-driven reasoning.

### 1. Carbon Calculation Engine (Deterministic Layer)

A local calculation model estimates emissions using India-specific approximations:

* **Electricity**: 0.82 kg CO₂ / kWh

* **Air Conditioning**: ~1.2 kWh per hour (1.5-ton AC)

* **Transport**:

  * Car: 0.18 kg/km
  * Bike: 0.04 kg/km
  * Bus: 0.03 kg/km
  * Metro: 0.015 kg/km
  * Walking/Cycling: 0

* **Diet**:

  * Vegetarian baseline: ~45 kg/month
  * Non-veg meals: +2.2 kg per meal

* **Lifestyle Consumption**:

  * Low: 30 kg/month
  * Medium: 75 kg/month
  * High: 160 kg/month

---

### 2. AI Intelligence Layer

A prompt-driven AI system (powered by Google Gemini) enhances raw calculations by:

* Analyzing emission patterns
* Identifying top contributors
* Generating personalized recommendations
* Predicting future emissions
* Providing behavioral motivation

---

## 🧠 AI Prompt Strategy

This project is built using a **structured prompt-driven architecture**, aligning with modern GenAI development practices.

The prompt is designed to:

* Convert user data into structured insights
* Enforce JSON output for consistency
* Quantify CO₂ reduction impact
* Adapt recommendations to Indian lifestyle constraints

This ensures:

* Explainable AI outputs
* Real-world relevance
* Consistent and actionable results

---

## ⚙️ How the Solution Works

```
User Input
   ↓
Carbon Calculator (Local Engine)
   ↓
AI Prompt Processing
   ↓
Structured Insights (JSON)
   ↓
Dashboard Visualization
```

---

## 🛠️ Core Features

### 📊 Carbon Footprint Analysis

* Monthly CO₂ estimation
* Category-wise breakdown
* Identification of top contributors

---

### 🤖 Personalized AI Recommendations

* Context-aware suggestions
* CO₂ reduction estimates
* Difficulty-based actions

---

### 🔮 Future Prediction Engine

* Yearly emission projection
* “What if no change?” scenario
* Potential improvement estimates

---

### ⚡ What-if Simulation

* Real-time impact of lifestyle changes
* Interactive decision-making

---

### 💰 CO₂ + Cost Savings

* Maps carbon reduction → financial savings
* Electricity & fuel cost estimation (₹)

---

### 🎯 Behavioral Coaching

* Identifies biggest problem area
* Suggests one actionable habit
* Motivational AI feedback

---

## 🌱 User Impact

This system helps users:

* Understand where their emissions come from
* Identify high-impact changes
* Reduce carbon footprint with practical actions
* Save money while being sustainable
* Build long-term eco-friendly habits

---

## 🧪 Assumptions

* Emission factors are approximations based on Indian averages
* User input is self-reported
* Electricity cost assumed at ~₹8/unit
* Fuel cost assumed at ~₹105/litre
* Predictions use simple extrapolation (not complex ML models)

---

## 🧪 Testing Strategy

* Input validation (empty, extreme, invalid cases)
* Functional testing (correct calculations + AI outputs)
* API failure handling (fallback to local engine)
* UI consistency testing

---

## 🎯 Evaluation Focus Areas

### ✅ Code Quality

* Modular structure (components, utils, API)
* Clean and maintainable codebase
* Separation of concerns

---

### 🔐 Security

* API keys stored securely (server-side only)
* No sensitive data exposure
* Safe input handling

---

### ⚡ Efficiency

* Lightweight frontend
* Minimal API calls
* Optimized computation logic

---

### 🧪 Testing

* Handles edge cases
* Consistent output structure
* Graceful failure handling

---

### ♿ Accessibility

* Clean and readable UI
* Responsive design
* High contrast and usability-focused layout

---

## 🏗️ Tech Stack

* **Frontend**: React 19, TypeScript, Tailwind CSS (v4), Lucide React Icons
* **Backend**: Node.js, Express (custom full-stack server proxy)
* **Build System**: Vite (client bundling) & Esbuild (server-side production compiler to CJS)
* **AI Integration**: Google GenAI SDK (`@google/genai`) powered by `gemini-3.5-flash`
* **Deployment**: Configured for unified full-stack containers on Google Cloud Run

---

## 🚀 Getting Started

1. Clone or export the repository from AI Studio.
2. In the project root, build and install dependencies:
   ```bash
   npm install
   ```
3. Set your `GEMINI_API_KEY` in your environment or a `.env` file.
4. Launch the application in developer mode:
   ```bash
   npm run dev
   ```
5. Open your local browser environment to port `3000` (e.g., `http://localhost:3000`).

---

## 📢 Final Note

AI Carbon Coach is not just a calculator—it is a **decision-support system**.

👉 It doesn’t just tell users their carbon footprint
👉 It shows them **how to reduce it, by how much, and why it matters**

---

## 🔮 Future Enhancements

* AI bill scanner (OCR)
* Gamification system (levels, rewards)
* Community challenges & leaderboard
* Location-based recommendations
* Mobile app version

---
