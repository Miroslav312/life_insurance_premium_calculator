# Life Insurance Premium Calculator & Dashboard

## Design & Architecture Document

---

## 1. Project Overview

A full-stack web application that calculates life insurance premiums using real actuarial mortality tables and visualises risk analytics. The app allows users to input policyholder details, computes net level premiums, and displays interactive charts for mortality curves and sensitivity analysis.

An optional Python microservice provides Monte Carlo simulation of policy outcomes.

---

## 2. Goals & Non-Goals

### Goals

- Calculate **net level premiums** for a term life insurance policy given age, term, sum assured, and interest rate.
- Load and query **public mortality tables** (US SSA or UK ONS).
- Visualise **mortality curves** (qx, lx) and **premium sensitivity** to interest rate changes.
- Expose a clean **REST API** that separates the quant logic from the UI.
- (Stretch) Run **Monte Carlo simulations** in Python to model insurer payout distributions.

### Non-Goals

- Production-grade authentication, payments, or policy management.
- Support for complex product types (annuities, endowments, variable life).
- Regulatory compliance or real underwriting rules.
- Database persistence (data is read-only from CSV/JSON mortality tables).

---

## 3. Key Actuarial Concepts

These are the domain concepts the codebase implements. You do **not** need an actuarial background — each one maps to straightforward code.

| Concept | What it means | How it appears in code |
| --- | --- | --- |
| **Mortality table** | A lookup table giving `qx` (probability of death at age x) and `lx` (number of survivors at age x out of an initial cohort, e.g. 100,000). | A CSV file loaded into memory; accessed by index = age. |
| **qx** | Probability that a person aged exactly x dies before reaching age x+1. | `mortalityTable[age].qx` |
| **lx** | Number of survivors at age x out of the original cohort. | `mortalityTable[age].lx` |
| **dx** | Number of deaths between age x and x+1. `dx = lx - lx+1` | Derived column. |
| **Discount factor (v)** | `v = 1 / (1 + i)` where `i` is the annual interest rate. Converts future money to present value. | A simple formula. |
| **Ax (Net Single Premium)** | Present value of a €1 death benefit. For a term policy of n years on a life aged x: $$A^1_{x:\overline{n}\|} = \sum_{t=0}^{n-1} v^{t+1} \cdot {}_tp_x \cdot q_{x+t}$$ where ${}_tp_x = l_{x+t} / l_x$ is the probability of surviving t years. | A loop summing discounted death probabilities. |
| **Ad (Annuity-due)** | Present value of €1 paid at the start of each year the life survives, for n years: $$\ddot{a}_{x:\overline{n}\|} = \sum_{t=0}^{n-1} v^{t} \cdot {}_tp_x$$ | A loop summing discounted survival probabilities. |
| **Net Level Premium (P)** | The annual premium that makes the policy actuarially fair: $$P = \frac{A^1_{x:\overline{n}\|}}{\ddot{a}_{x:\overline{n}\|}} \times \text{Sum Assured}$$ | Division of two numbers, then multiply by sum assured. |
| **Monte Carlo simulation** | Simulate N policyholders: for each, randomly determine year of death (using qx probabilities) and compute the insurer's payout. Aggregate results show the distribution of total claims. | A loop with random number generation. |

---

## 4. High-Level Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│                                                                  │
│  React + TypeScript + Vite                                       │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │ PremiumForm   │  │ MortalityCurve   │  │ SensitivityChart  │  │
│  │ (input form)  │  │ (qx/lx chart)    │  │ (premium vs rate) │  │
│  └──────┬───────┘  └───────┬──────────┘  └────────┬──────────┘  │
│         │                  │                       │             │
│         └──────────────────┼───────────────────────┘             │
│                            │  HTTP (REST)                        │
└────────────────────────────┼─────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                    BACKEND (NestJS)                               │
│                            │                                     │
│  ┌─────────────────────────▼──────────────────────────────────┐  │
│  │                   API Gateway Layer                         │  │
│  │  PremiumController        MortalityController              │  │
│  │  POST /api/premium        GET /api/mortality               │  │
│  │  POST /api/sensitivity    GET /api/mortality/curve          │  │
│  └─────────────────────────┬──────────────────────────────────┘  │
│                            │                                     │
│  ┌─────────────────────────▼──────────────────────────────────┐  │
│  │                   Service Layer                             │  │
│  │  PremiumService           MortalityService                 │  │
│  │  - calculateNetPremium()  - loadLifeTable()                │  │
│  │  - calculateAx()         - getQx(age)                     │  │
│  │  - calculateAnnuity()    - getLx(age)                     │  │
│  │  - sensitivityRange()    - getCurveData()                 │  │
│  └─────────────────────────┬──────────────────────────────────┘  │
│                            │                                     │
│  ┌─────────────────────────▼──────────────────────────────────┐  │
│  │                   Data Layer                                │  │
│  │  american-life-table.csv (loaded once at startup into memory)       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────┬───────────────────────────────────────────┘
                       │  HTTP (internal, optional)
┌──────────────────────▼───────────────────────────────────────────┐
│              QUANT MICROSERVICE (Python, optional)                │
│                                                                  │
│  FastAPI                                                         │
│  POST /simulate                                                  │
│  - Accepts: age, term, sum_assured, interest_rate, n_simulations │
│  - Returns: histogram data, mean payout, percentiles             │
│  - Uses the same mortality CSV                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Technology Stack

| Layer | Technology | Reason |
| --- | --- | --- |
| Frontend | React 18+, TypeScript, Vite | Target stack. Vite for fast dev experience. |
| Charting | Recharts | Lightweight, React-native, good for line/bar charts. |
| HTTP Client | Axios | Clean API, interceptors, TypeScript support. |
| Backend | NestJS (on Node.js + Express) | Target stack. Provides structure (modules, controllers, services). |
| Validation | class-validator + class-transformer | NestJS-idiomatic DTO validation. |
| Quant (Python) | FastAPI, NumPy | Fast, async Python API; NumPy for vectorised simulation. |
| Data | CSV (parsed with csv-parser / pandas) | No database needed — mortality tables are static read-only data. |
| Tooling | ESLint, Prettier, Jest (TS), pytest (Python) | Standard quality tooling. |

---

## 6. API Design

### 6.1 Premium Calculation

```text
POST /api/premium/calculate
```

**Request body:**

```json
{
  "age": 30,
  "term": 20,
  "sumAssured": 100000,
  "interestRate": 0.05,
  "smoker": false
}
```

**Response:**

```json
{
  "netAnnualPremium": 182.47,
  "ax": 0.01912,
  "annuityDue": 10.47,
  "inputs": {
    "age": 30,
    "term": 20,
    "sumAssured": 100000,
    "interestRate": 0.05
  }
}
```

### 6.2 Sensitivity Analysis

```text
POST /api/premium/sensitivity
```

**Request body:**

```json
{
  "age": 30,
  "term": 20,
  "sumAssured": 100000,
  "interestRateMin": 0.01,
  "interestRateMax": 0.10,
  "interestRateStep": 0.005
}
```

**Response:**

```json
{
  "dataPoints": [
    { "interestRate": 0.010, "netAnnualPremium": 243.12 },
    { "interestRate": 0.015, "netAnnualPremium": 231.88 },
    "..."
  ]
}
```

### 6.3 Mortality Data

```text
GET /api/mortality/curve
```

**Response:**

```json
{
  "data": [
    { "age": 0, "qx": 0.00587, "lx": 100000 },
    { "age": 1, "qx": 0.00039, "lx": 99413 },
    "..."
  ]
}
```

### 6.4 Monte Carlo Simulation (Python microservice)

```text
POST /api/simulation/run
```

NestJS proxies this request to the Python service at `http://localhost:8000/simulate`.

**Request body:**

```json
{
  "age": 30,
  "term": 20,
  "sumAssured": 100000,
  "interestRate": 0.05,
  "numSimulations": 10000
}
```

**Response:**

```json
{
  "meanPayout": 1823.45,
  "percentile5": 0,
  "percentile95": 4200.00,
  "histogram": [
    { "bucket": "0", "count": 8234 },
    { "bucket": "100000", "count": 1766 }
  ]
}
```

---

## 7. Data Model

### 7.1 Mortality Table Row (TypeScript)

```typescript
interface MortalityRow {
  age: number;        // 0–119
  qx: number;         // probability of death, 0 < qx <= 1
  lx: number;         // survivors out of initial 100,000
  dx: number;         // deaths = lx - l(x+1)
  ex: number;         // life expectancy at age x (optional)
}
```

### 7.2 Premium Calculation DTOs

```typescript
class CalculatePremiumDto {
  @IsInt() @Min(0) @Max(100)
  age: number;

  @IsInt() @Min(1) @Max(50)
  term: number;

  @IsNumber() @Min(1000)
  sumAssured: number;

  @IsNumber() @Min(0.001) @Max(0.20)
  interestRate: number;

  @IsBoolean() @IsOptional()
  smoker?: boolean;
}
```

---

## 8. Frontend Component Tree

```text
<App>
├── <Header />
├── <MainLayout>
│   ├── <PremiumCalculator>
│   │   ├── <PremiumForm />           // age, term, sum assured, rate, smoker toggle
│   │   └── <PremiumResult />         // displays calculated premium + breakdown
│   ├── <MortalityCurveChart />       // line chart of qx and lx vs age
│   ├── <SensitivityChart />          // line chart of premium vs interest rate
│   └── <SimulationPanel />           // (optional) trigger simulation, show histogram
└── <Footer />
```

### State Management

- **No global state library needed.** Use React's `useState` and prop drilling for this scale.
- API calls via custom hooks: `usePremiumCalculation()`, `useMortalityData()`, `useSensitivity()`.

---

## 9. Project Structure

```text
actuarial/
├── docs/
│   ├── DESIGN_AND_ARCHITECTURE.md    ← this document
│   └── IMPLEMENTATION_STEPS.md       ← step-by-step build guide
│
├── frontend/                         ← React + Vite + TypeScript
│   ├── public/
│   ├── src/
│   │   ├── api/                      ← Axios client & typed API functions
│   │   │   └── premiumApi.ts
│   │   ├── components/
│   │   │   ├── PremiumForm.tsx
│   │   │   ├── PremiumResult.tsx
│   │   │   ├── MortalityCurveChart.tsx
│   │   │   ├── SensitivityChart.tsx
│   │   │   └── SimulationPanel.tsx
│   │   ├── hooks/
│   │   │   ├── usePremiumCalculation.ts
│   │   │   ├── useMortalityData.ts
│   │   │   └── useSensitivity.ts
│   │   ├── types/
│   │   │   └── index.ts              ← shared TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                          ← NestJS
│   ├── src/
│   │   ├── premium/
│   │   │   ├── premium.controller.ts
│   │   │   ├── premium.service.ts
│   │   │   ├── premium.module.ts
│   │   │   └── dto/
│   │   │       ├── calculate-premium.dto.ts
│   │   │       └── sensitivity.dto.ts
│   │   ├── mortality/
│   │   │   ├── mortality.controller.ts
│   │   │   ├── mortality.service.ts
│   │   │   └── mortality.module.ts
│   │   ├── simulation/               ← proxy to Python service
│   │   │   ├── simulation.controller.ts
│   │   │   ├── simulation.service.ts
│   │   │   └── simulation.module.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/
│   │   └── premium.service.spec.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── nest-cli.json
│
├── quant/                            ← Python microservice (optional)
│   ├── main.py                       ← FastAPI app
│   ├── simulation.py                 ← Monte Carlo logic
│   ├── requirements.txt
│   └── test_simulation.py
│
├── data/
│   └── american-life-table.csv       ← public mortality data
│
└── README.md
```

---

## 10. Key Design Decisions

| Decision | Rationale |
| --- | --- |
| **No database** | Mortality tables are static; loading a CSV into memory is simpler and faster. |
| **NestJS modules map to domain areas** | `PremiumModule` and `MortalityModule` keep concerns separated cleanly. |
| **Python as a separate service** | Demonstrates polyglot architecture (matches job stack) without coupling Python into the Node runtime. |
| **Validation via DTOs** | NestJS pipes + class-validator catch bad inputs before they reach business logic. |
| **No auth** | This is a portfolio/demo project. Adding auth would add complexity without demonstrating actuarial skills. |
| **Recharts over D3** | Recharts is simpler for standard chart types and React-native; D3 is overkill here. |

---

## 11. Error Handling Strategy

- **Backend**: NestJS exception filters return consistent JSON error responses with appropriate HTTP status codes.
- **Validation errors** (400): Returned automatically by the `ValidationPipe`.
- **Domain errors** (422): e.g., age + term exceeds mortality table range.
- **Frontend**: API errors caught in hooks; displayed inline near the form (not as alerts/modals).

---

## 12. Testing Strategy

| Layer | Tool | What to test |
| --- | --- | --- |
| Backend unit | Jest | `PremiumService.calculateNetPremium()` with known inputs → verify against hand-calculated values. |
| Backend e2e | Supertest | Hit `/api/premium/calculate` with valid/invalid payloads, assert status codes and response shape. |
| Python unit | pytest | `simulate()` returns expected statistical properties (mean within tolerance). |
| Frontend | React Testing Library | Form submission triggers API call; result component renders premium value. |

---

## 13. Deployment (optional, for bonus points)

- **Frontend**: Vercel or Netlify (static build)
- **Backend**: Railway, Render, or Fly.io (Node.js)
- **Python**: Same host or a separate container
- **Mono-repo**: Use npm workspaces or Turborepo if you want a single repo build

---

## 14. Future Extensions (out of scope, but good to mention in interviews)

- Multiple product types (whole-of-life, endowment)
- Smoker/non-smoker separate mortality tables
- Expense loadings and profit margins on top of net premium
- PDF report generation
- Comparison of multiple quotes side-by-side
