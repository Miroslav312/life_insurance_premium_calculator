# Life Insurance Premium Calculator

A full-stack web app that calculates net level life insurance premiums using real actuarial mortality tables, visualises mortality and sensitivity curves, and runs Monte Carlo simulations of policy outcomes.

> _Screenshot: add one here once the app is running._

## Tech Stack

- **Frontend** — React 19, TypeScript, Vite, Recharts, Axios
- **Backend** — NestJS 11, class-validator, csv-parser
- **Simulation service** — FastAPI, NumPy, Pandas (Python 3.10+)
- **Testing** — Jest (backend), pytest (Python)

## Architecture

```
┌──────────────────────────────────────────────────────┐
│   React frontend (Vite, :5173)                       │
│   Form → Results → Sensitivity / Mortality / Sim     │
└────────────────────────┬─────────────────────────────┘
                         │ REST
┌────────────────────────▼─────────────────────────────┐
│   NestJS backend (:3001)                             │
│   /api/premium · /api/mortality · /api/simulation    │
│   Loads mortality CSV once at startup                │
└────────────────────────┬─────────────────────────────┘
                         │ HTTP (proxy)
┌────────────────────────▼─────────────────────────────┐
│   FastAPI Monte Carlo service (:8000, optional)      │
└──────────────────────────────────────────────────────┘
```

## How to Run

You need Node 18+ and Python 3.10+.

```bash
# 1. Backend (NestJS) — port 3001
cd backend
npm install
npm run start:dev

# 2. Frontend (Vite) — port 5173
cd frontend
npm install
npm run dev

# 3. Simulation service (Python, optional) — port 8000
cd quant
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --port 8000 --reload
```

Open <http://localhost:5173>. The premium and sensitivity charts work without the Python service; the Monte Carlo panel needs it running.

## Actuarial Concepts

| Symbol | Meaning |
| --- | --- |
| **qx** | Probability that a person aged x dies before reaching age x+1. |
| **lx** | Number of survivors at age x out of an initial cohort (100,000). |
| **Ax** | Net single premium — present value of a €1 death benefit over an n-year term. |
| **äx** | Annuity-due — present value of a €1/year survival-contingent annuity. |
| **Net level premium** | P = (Ax / äx) × Sum Assured. Annual premium that makes the policy actuarially fair. |

Mortality data is the US SSA period life table (both sexes, kept side-by-side in `data/american-life-table.csv`); the backend loader accepts either that wide schema or the standard `age,qx,lx,dx,ex` form.

## Testing

```bash
# Backend
cd backend && npm test

# Python simulation
cd quant && pytest
```

## Future Extensions

- Smoker / non-smoker separate mortality tables
- Expense loadings and profit margins on top of the net premium
- Side-by-side comparison of multiple quotes
- Whole-of-life and endowment product types

## Docs

- [Design & Architecture](docs/DESIGN_AND_ARCHITECTURE.md)
- [Implementation Steps](docs/IMPLEMENTATION_STEPS.md)
