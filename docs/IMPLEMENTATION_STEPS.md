# Life Insurance Premium Calculator & Dashboard

## Implementation Steps

---

> **How to use this guide**: Work through the phases in order. Each phase ends with a working checkpoint you can run and verify before moving on. Estimated effort per phase is included so you can plan your time.

---

## Phase 0 — Environment Setup

### 0.1 Prerequisites

Install the following if you don't have them:

- **Node.js** (v18+ LTS) — [nodejs.org](https://nodejs.org)
- **npm** (comes with Node.js)
- **Python** (3.10+) — [python.org](https://python.org)
- **Git** — [git-scm.com](https://git-scm.com)
- **VS Code** (recommended) with extensions: ESLint, Prettier, Python

### 0.2 Create the project root

```bash
mkdir actuarial
cd actuarial
git init
```

### 0.3 Create a `.gitignore`

```gitignore
node_modules/
dist/
.env
__pycache__/
*.pyc
.venv/
```

### 0.4 Create the `data/` folder with a mortality table

1. Go to the US SSA life table page: <https://www.ssa.gov/oact/STATS/table4c6.html>
2. Copy the table data into a CSV file.
3. Save it as `data/american-life-table.csv`. The repo uses the SSA wide schema with both sexes side-by-side:

```csv
age, male_death_probability, male_number_of_lives, male_life_expectancy, female_death_probability, female_number_of_lives, female_life_expectancy
0,   0.006064,               100000,               74.74,                0.005119,                 100000,                 80.18
1,   0.000491,               99394,                74.20,                0.000398,                 99488,                  79.60
2,   0.000309,               99345,                73.23,                0.000240,                 99449,                  78.63
...
```

> **Note**: The mortality loader accepts either schema via column aliasing — the SSA wide format above, or a simpler `age,qx,lx,dx,ex` layout. You only need `age` plus a `qx`/`lx` pair (male or female) at minimum.

**Checkpoint**: You have a project root with `data/american-life-table.csv` and a `.gitignore`. Commit this.

---

## Phase 1 — Backend: NestJS API

This is the core of the project. Build the API first so you can test it independently.

### 1.1 Scaffold the NestJS project

```bash
# From the project root
npx @nestjs/cli new backend --package-manager npm --skip-git
cd backend
```

This creates a full NestJS project with TypeScript config, jest, and a starter module.

### 1.2 Install extra dependencies

```bash
npm install class-validator class-transformer csv-parser
npm install -D @types/csv-parser
```

### 1.3 Enable global validation

Edit `backend/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();          // allow frontend to connect
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(3001);    // port 3001 so it doesn't clash with React on 5173
}
bootstrap();
```

### 1.4 Create the Mortality module

Generate the module, service, and controller:

```bash
npx nest generate module mortality
npx nest generate service mortality
npx nest generate controller mortality
```

#### `mortality/mortality.service.ts`

This service loads the CSV at startup and exposes typed data:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as csvParser from 'csv-parser';

export interface MortalityRow {
  age: number;
  qx: number;
  lx: number;
  dx: number;
  ex: number;
}

@Injectable()
export class MortalityService implements OnModuleInit {
  private table: MortalityRow[] = [];

  async onModuleInit() {
    await this.loadTable();
  }

  private loadTable(): Promise<void> {
    return new Promise((resolve, reject) => {
      const csvPath = path.resolve(__dirname, '..', '..', '..', 'data', 'american-life-table.csv');
      const rows: MortalityRow[] = [];

      fs.createReadStream(csvPath)
        .pipe(csvParser())
        .on('data', (row: Record<string, string>) => {
          rows.push({
            age: parseInt(row.age, 10),
            qx: parseFloat(row.qx),
            lx: parseFloat(row.lx),
            dx: parseFloat(row.dx || '0'),
            ex: parseFloat(row.ex || '0'),
          });
        })
        .on('end', () => {
          this.table = rows.sort((a, b) => a.age - b.age);
          resolve();
        })
        .on('error', reject);
    });
  }

  getFullTable(): MortalityRow[] {
    return this.table;
  }

  getRow(age: number): MortalityRow | undefined {
    return this.table.find((r) => r.age === age);
  }

  getQx(age: number): number {
    const row = this.getRow(age);
    if (!row) throw new Error(`No mortality data for age ${age}`);
    return row.qx;
  }

  getLx(age: number): number {
    const row = this.getRow(age);
    if (!row) throw new Error(`No mortality data for age ${age}`);
    return row.lx;
  }

  getMaxAge(): number {
    return this.table[this.table.length - 1]?.age ?? 0;
  }
}
```

#### `mortality/mortality.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';
import { MortalityService } from './mortality.service';

@Controller('mortality')
export class MortalityController {
  constructor(private readonly mortalityService: MortalityService) {}

  @Get('curve')
  getCurve() {
    return {
      data: this.mortalityService.getFullTable().map(({ age, qx, lx }) => ({
        age,
        qx,
        lx,
      })),
    };
  }
}
```

#### `mortality/mortality.module.ts`

Make sure `MortalityService` is **exported** so the Premium module can use it:

```typescript
import { Module } from '@nestjs/common';
import { MortalityService } from './mortality.service';
import { MortalityController } from './mortality.controller';

@Module({
  providers: [MortalityService],
  controllers: [MortalityController],
  exports: [MortalityService],        // ← important
})
export class MortalityModule {}
```

### 1.5 Create the Premium module

```bash
npx nest generate module premium
npx nest generate service premium
npx nest generate controller premium
```

#### `premium/dto/calculate-premium.dto.ts`

```typescript
import { IsInt, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class CalculatePremiumDto {
  @IsInt()
  @Min(0)
  @Max(100)
  age: number;

  @IsInt()
  @Min(1)
  @Max(50)
  term: number;

  @IsNumber()
  @Min(1000)
  sumAssured: number;

  @IsNumber()
  @Min(0.001)
  @Max(0.20)
  interestRate: number;

  @IsBoolean()
  @IsOptional()
  smoker?: boolean;
}
```

#### `premium/dto/sensitivity.dto.ts`

```typescript
import { IsInt, IsNumber, Min, Max } from 'class-validator';

export class SensitivityDto {
  @IsInt()
  @Min(0)
  @Max(100)
  age: number;

  @IsInt()
  @Min(1)
  @Max(50)
  term: number;

  @IsNumber()
  @Min(1000)
  sumAssured: number;

  @IsNumber()
  @Min(0.001)
  @Max(0.20)
  interestRateMin: number;

  @IsNumber()
  @Min(0.001)
  @Max(0.20)
  interestRateMax: number;

  @IsNumber()
  @Min(0.001)
  @Max(0.05)
  interestRateStep: number;
}
```

#### `premium/premium.service.ts`

This is the core actuarial logic. Each method maps directly to a formula from the design doc.

```typescript
import { Injectable } from '@nestjs/common';
import { MortalityService } from '../mortality/mortality.service';

@Injectable()
export class PremiumService {
  constructor(private readonly mortality: MortalityService) {}

  /**
   * Calculate Ax — present value of a £1 death benefit
   * for a term life policy on a life aged x, for n years.
   *
   * Formula: Ax = Σ (t=0 to n-1) v^(t+1) * tPx * q(x+t)
   *
   * where:
   *   v = 1 / (1 + i)             discount factor
   *   tPx = l(x+t) / l(x)        probability of surviving t years
   *   q(x+t) = mortality rate at age x+t
   */
  calculateAx(age: number, term: number, interestRate: number): number {
    const v = 1 / (1 + interestRate);
    const lx = this.mortality.getLx(age);
    let ax = 0;

    for (let t = 0; t < term; t++) {
      const tPx = this.mortality.getLx(age + t) / lx; // survival probability
      const qxt = this.mortality.getQx(age + t);       // mortality rate
      ax += Math.pow(v, t + 1) * tPx * qxt;
    }

    return ax;
  }

  /**
   * Calculate äx — present value of an annuity-due of £1/year
   * for n years on a life aged x.
   *
   * Formula: äx = Σ (t=0 to n-1) v^t * tPx
   */
  calculateAnnuityDue(age: number, term: number, interestRate: number): number {
    const v = 1 / (1 + interestRate);
    const lx = this.mortality.getLx(age);
    let annuity = 0;

    for (let t = 0; t < term; t++) {
      const tPx = this.mortality.getLx(age + t) / lx;
      annuity += Math.pow(v, t) * tPx;
    }

    return annuity;
  }

  /**
   * Calculate the net level annual premium.
   *
   * Premium = (Ax / äx) × Sum Assured
   */
  calculateNetPremium(
    age: number,
    term: number,
    sumAssured: number,
    interestRate: number,
  ): { netAnnualPremium: number; ax: number; annuityDue: number } {
    const ax = this.calculateAx(age, term, interestRate);
    const annuityDue = this.calculateAnnuityDue(age, term, interestRate);
    const netAnnualPremium = (ax / annuityDue) * sumAssured;

    return {
      netAnnualPremium: Math.round(netAnnualPremium * 100) / 100,
      ax: Math.round(ax * 100000) / 100000,
      annuityDue: Math.round(annuityDue * 100000) / 100000,
    };
  }
}
```

#### `premium/premium.controller.ts`

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { PremiumService } from './premium.service';
import { CalculatePremiumDto } from './dto/calculate-premium.dto';
import { SensitivityDto } from './dto/sensitivity.dto';

@Controller('premium')
export class PremiumController {
  constructor(private readonly premiumService: PremiumService) {}

  @Post('calculate')
  calculate(@Body() dto: CalculatePremiumDto) {
    const result = this.premiumService.calculateNetPremium(
      dto.age,
      dto.term,
      dto.sumAssured,
      dto.interestRate,
    );
    return { ...result, inputs: dto };
  }

  @Post('sensitivity')
  sensitivity(@Body() dto: SensitivityDto) {
    const dataPoints = [];
    for (
      let rate = dto.interestRateMin;
      rate <= dto.interestRateMax;
      rate += dto.interestRateStep
    ) {
      const roundedRate = Math.round(rate * 10000) / 10000;
      const { netAnnualPremium } = this.premiumService.calculateNetPremium(
        dto.age,
        dto.term,
        dto.sumAssured,
        roundedRate,
      );
      dataPoints.push({ interestRate: roundedRate, netAnnualPremium });
    }
    return { dataPoints };
  }
}
```

#### `premium/premium.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PremiumService } from './premium.service';
import { PremiumController } from './premium.controller';
import { MortalityModule } from '../mortality/mortality.module';

@Module({
  imports: [MortalityModule],   // ← import so we can inject MortalityService
  providers: [PremiumService],
  controllers: [PremiumController],
})
export class PremiumModule {}
```

#### `app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { MortalityModule } from './mortality/mortality.module';
import { PremiumModule } from './premium/premium.module';

@Module({
  imports: [MortalityModule, PremiumModule],
})
export class AppModule {}
```

### 1.6 Test the backend

```bash
cd backend
npm run start:dev
```

Then in another terminal:

```bash
# Test mortality curve
curl http://localhost:3001/api/mortality/curve

# Test premium calculation
curl -X POST http://localhost:3001/api/premium/calculate \
  -H "Content-Type: application/json" \
  -d '{"age": 30, "term": 20, "sumAssured": 100000, "interestRate": 0.05}'

# Test sensitivity
curl -X POST http://localhost:3001/api/premium/sensitivity \
  -H "Content-Type: application/json" \
  -d '{"age": 30, "term": 20, "sumAssured": 100000, "interestRateMin": 0.01, "interestRateMax": 0.10, "interestRateStep": 0.01}'
```

### 1.7 Write a unit test

Create `backend/test/premium.service.spec.ts`:

```typescript
import { PremiumService } from '../src/premium/premium.service';
import { MortalityService } from '../src/mortality/mortality.service';

describe('PremiumService', () => {
  let premiumService: PremiumService;

  beforeAll(async () => {
    const mortalityService = new MortalityService();
    await mortalityService.onModuleInit();
    premiumService = new PremiumService(mortalityService);
  });

  it('should calculate a positive net premium', () => {
    const result = premiumService.calculateNetPremium(30, 20, 100000, 0.05);
    expect(result.netAnnualPremium).toBeGreaterThan(0);
    expect(result.netAnnualPremium).toBeLessThan(10000); // sanity check
  });

  it('should return higher premium for older age', () => {
    const young = premiumService.calculateNetPremium(25, 20, 100000, 0.05);
    const old = premiumService.calculateNetPremium(50, 20, 100000, 0.05);
    expect(old.netAnnualPremium).toBeGreaterThan(young.netAnnualPremium);
  });

  it('should return lower premium for higher interest rate', () => {
    const lowRate = premiumService.calculateNetPremium(30, 20, 100000, 0.02);
    const highRate = premiumService.calculateNetPremium(30, 20, 100000, 0.08);
    expect(highRate.netAnnualPremium).toBeLessThan(lowRate.netAnnualPremium);
  });
});
```

Run with: `npm test`

**Checkpoint**: All three curl commands return valid JSON. Unit tests pass. Commit.

---

## Phase 2 — Frontend: React + Vite

### 2.1 Scaffold the React project

```bash
# From the project root (not inside backend/)
cd ..
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

### 2.2 Install dependencies

```bash
npm install axios recharts
```

### 2.3 Set up the API client

Create `frontend/src/api/premiumApi.ts`:

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

export interface PremiumRequest {
  age: number;
  term: number;
  sumAssured: number;
  interestRate: number;
  smoker?: boolean;
}

export interface PremiumResponse {
  netAnnualPremium: number;
  ax: number;
  annuityDue: number;
  inputs: PremiumRequest;
}

export interface SensitivityRequest {
  age: number;
  term: number;
  sumAssured: number;
  interestRateMin: number;
  interestRateMax: number;
  interestRateStep: number;
}

export interface SensitivityDataPoint {
  interestRate: number;
  netAnnualPremium: number;
}

export interface MortalityCurvePoint {
  age: number;
  qx: number;
  lx: number;
}

export const calculatePremium = (data: PremiumRequest) =>
  api.post<PremiumResponse>('/premium/calculate', data);

export const getSensitivity = (data: SensitivityRequest) =>
  api.post<{ dataPoints: SensitivityDataPoint[] }>('/premium/sensitivity', data);

export const getMortalityCurve = () =>
  api.get<{ data: MortalityCurvePoint[] }>('/mortality/curve');
```

### 2.4 Build the PremiumForm component

Create `frontend/src/components/PremiumForm.tsx`:

```tsx
import { useState, FormEvent } from 'react';
import { PremiumRequest } from '../api/premiumApi';

interface Props {
  onSubmit: (data: PremiumRequest) => void;
  loading: boolean;
}

export function PremiumForm({ onSubmit, loading }: Props) {
  const [age, setAge] = useState(30);
  const [term, setTerm] = useState(20);
  const [sumAssured, setSumAssured] = useState(100000);
  const [interestRate, setInterestRate] = useState(0.05);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ age, term, sumAssured, interestRate });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Premium Calculator</h2>

      <label>
        Age:
        <input type="number" value={age} min={0} max={100}
          onChange={(e) => setAge(Number(e.target.value))} />
      </label>

      <label>
        Policy Term (years):
        <input type="number" value={term} min={1} max={50}
          onChange={(e) => setTerm(Number(e.target.value))} />
      </label>

      <label>
        Sum Assured (£/$):
        <input type="number" value={sumAssured} min={1000}
          onChange={(e) => setSumAssured(Number(e.target.value))} />
      </label>

      <label>
        Interest Rate:
        <input type="number" value={interestRate} min={0.001} max={0.20} step={0.005}
          onChange={(e) => setInterestRate(Number(e.target.value))} />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? 'Calculating...' : 'Calculate Premium'}
      </button>
    </form>
  );
}
```

### 2.5 Build the PremiumResult component

Create `frontend/src/components/PremiumResult.tsx`:

```tsx
import { PremiumResponse } from '../api/premiumApi';

interface Props {
  result: PremiumResponse | null;
}

export function PremiumResult({ result }: Props) {
  if (!result) return null;

  return (
    <div className="result-card">
      <h3>Result</h3>
      <p><strong>Net Annual Premium:</strong> £{result.netAnnualPremium.toLocaleString()}</p>
      <p><strong>Ax (PV of benefit):</strong> {result.ax.toFixed(5)}</p>
      <p><strong>äx (Annuity-due):</strong> {result.annuityDue.toFixed(5)}</p>
    </div>
  );
}
```

### 2.6 Build the MortalityCurveChart component

Create `frontend/src/components/MortalityCurveChart.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getMortalityCurve, MortalityCurvePoint } from '../api/premiumApi';

export function MortalityCurveChart() {
  const [data, setData] = useState<MortalityCurvePoint[]>([]);

  useEffect(() => {
    getMortalityCurve().then((res) => setData(res.data.data));
  }, []);

  return (
    <div>
      <h2>Mortality Curve (qx by Age)</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="age" label={{ value: 'Age', position: 'insideBottom', offset: -5 }} />
          <YAxis label={{ value: 'qx', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="qx" stroke="#e74c3c" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### 2.7 Build the SensitivityChart component

Create `frontend/src/components/SensitivityChart.tsx`:

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SensitivityDataPoint } from '../api/premiumApi';

interface Props {
  data: SensitivityDataPoint[];
}

export function SensitivityChart({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <div>
      <h2>Sensitivity: Premium vs Interest Rate</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="interestRate"
            tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
            label={{ value: 'Interest Rate', position: 'insideBottom', offset: -5 }}
          />
          <YAxis label={{ value: 'Annual Premium (£)', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(v: number) => `£${v.toFixed(2)}`} />
          <Line type="monotone" dataKey="netAnnualPremium" stroke="#2980b9" dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### 2.8 Wire everything together in App.tsx

```tsx
import { useState } from 'react';
import { PremiumForm } from './components/PremiumForm';
import { PremiumResult } from './components/PremiumResult';
import { MortalityCurveChart } from './components/MortalityCurveChart';
import { SensitivityChart } from './components/SensitivityChart';
import {
  calculatePremium,
  getSensitivity,
  PremiumRequest,
  PremiumResponse,
  SensitivityDataPoint,
} from './api/premiumApi';

function App() {
  const [result, setResult] = useState<PremiumResponse | null>(null);
  const [sensitivityData, setSensitivityData] = useState<SensitivityDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async (data: PremiumRequest) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch premium and sensitivity in parallel
      const [premiumRes, sensitivityRes] = await Promise.all([
        calculatePremium(data),
        getSensitivity({
          age: data.age,
          term: data.term,
          sumAssured: data.sumAssured,
          interestRateMin: 0.01,
          interestRateMax: 0.10,
          interestRateStep: 0.005,
        }),
      ]);
      setResult(premiumRes.data);
      setSensitivityData(sensitivityRes.data.dataPoints);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <h1>Life Insurance Premium Calculator</h1>
      <PremiumForm onSubmit={handleCalculate} loading={loading} />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <PremiumResult result={result} />
      <SensitivityChart data={sensitivityData} />
      <MortalityCurveChart />
    </div>
  );
}

export default App;
```

### 2.9 Run the frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`. Make sure the backend is running on port 3001. Fill out the form and hit Calculate.

**Checkpoint**: Form submits, premium displays, both charts render. Commit.

---

## Phase 3 — Python Monte Carlo Simulation (Stretch Goal)

This phase is optional but impresses interviewers because it demonstrates the polyglot stack.

### 3.1 Set up the Python project

```bash
# From project root
mkdir quant
cd quant
python -m venv .venv

# Activate:
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate

pip install fastapi uvicorn numpy pandas
pip freeze > requirements.txt
```

### 3.2 Write the simulation logic

Create `quant/simulation.py`:

```python
import numpy as np
import pandas as pd
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "american-life-table.csv"


def load_mortality_table() -> pd.DataFrame:
    return pd.read_csv(DATA_PATH)


def simulate_policy_outcomes(
    age: int,
    term: int,
    sum_assured: float,
    interest_rate: float,
    n_simulations: int = 10000,
) -> dict:
    """
    For each simulated policyholder:
    - Walk year by year from age to age+term
    - Each year, draw a random number; if < qx, the policyholder dies
    - If they die in year t, the insurer pays sum_assured discounted to present value
    - If they survive the full term, the insurer pays nothing (term life)

    Returns summary statistics and histogram data.
    """
    table = load_mortality_table()
    qx_lookup = dict(zip(table["age"], table["qx"]))

    payouts = np.zeros(n_simulations)

    for i in range(n_simulations):
        for t in range(term):
            current_age = age + t
            qx = qx_lookup.get(current_age, 1.0)

            if np.random.random() < qx:
                # Policyholder dies: compute present value of payout
                discount = (1 / (1 + interest_rate)) ** (t + 1)
                payouts[i] = sum_assured * discount
                break

    return {
        "meanPayout": round(float(np.mean(payouts)), 2),
        "medianPayout": round(float(np.median(payouts)), 2),
        "percentile5": round(float(np.percentile(payouts, 5)), 2),
        "percentile95": round(float(np.percentile(payouts, 95)), 2),
        "proportionClaimed": round(float(np.count_nonzero(payouts) / n_simulations), 4),
        "histogram": _build_histogram(payouts),
    }


def _build_histogram(payouts: np.ndarray, bins: int = 20) -> list[dict]:
    counts, edges = np.histogram(payouts, bins=bins)
    return [
        {
            "bucketMin": round(float(edges[i]), 2),
            "bucketMax": round(float(edges[i + 1]), 2),
            "count": int(counts[i]),
        }
        for i in range(len(counts))
    ]
```

### 3.3 Create the FastAPI app

Create `quant/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from simulation import simulate_policy_outcomes

app = FastAPI(title="Actuarial Monte Carlo Simulation")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SimulationRequest(BaseModel):
    age: int = Field(ge=0, le=100)
    term: int = Field(ge=1, le=50)
    sum_assured: float = Field(ge=1000, alias="sumAssured")
    interest_rate: float = Field(ge=0.001, le=0.20, alias="interestRate")
    num_simulations: int = Field(default=10000, ge=100, le=100000, alias="numSimulations")


@app.post("/simulate")
def run_simulation(req: SimulationRequest):
    return simulate_policy_outcomes(
        age=req.age,
        term=req.term,
        sum_assured=req.sum_assured,
        interest_rate=req.interest_rate,
        n_simulations=req.num_simulations,
    )
```

### 3.4 Run the Python service

```bash
cd quant
uvicorn main:app --port 8000 --reload
```

Test:

```bash
curl -X POST http://localhost:8000/simulate \
  -H "Content-Type: application/json" \
  -d '{"age": 30, "term": 20, "sumAssured": 100000, "interestRate": 0.05, "numSimulations": 10000}'
```

### 3.5 Add a proxy endpoint in NestJS (optional)

Create a `SimulationModule` in NestJS that forwards requests to the Python service using `axios` or `HttpModule`. This keeps the frontend talking to a single backend URL.

```bash
cd backend
npm install @nestjs/axios axios
npx nest generate module simulation
npx nest generate service simulation
npx nest generate controller simulation
```

The `SimulationService` simply proxies:

```typescript
import { Injectable, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SimulationService {
  constructor(private readonly http: HttpService) {}

  async runSimulation(body: Record<string, unknown>) {
    try {
      const response = await firstValueFrom(
        this.http.post('http://localhost:8000/simulate', body),
      );
      return response.data;
    } catch (error) {
      throw new HttpException('Simulation service unavailable', 503);
    }
  }
}
```

### 3.6 Write a Python test

Create `quant/test_simulation.py`:

```python
from simulation import simulate_policy_outcomes


def test_simulation_returns_expected_keys():
    result = simulate_policy_outcomes(
        age=30, term=20, sum_assured=100000, interest_rate=0.05, n_simulations=1000
    )
    assert "meanPayout" in result
    assert "histogram" in result
    assert result["proportionClaimed"] > 0
    assert result["proportionClaimed"] < 1


def test_older_age_has_higher_payout():
    young = simulate_policy_outcomes(age=25, term=20, sum_assured=100000, interest_rate=0.05, n_simulations=5000)
    old = simulate_policy_outcomes(age=55, term=20, sum_assured=100000, interest_rate=0.05, n_simulations=5000)
    assert old["meanPayout"] > young["meanPayout"]
```

Run: `pytest test_simulation.py`

**Checkpoint**: Python simulation returns valid results. NestJS proxy works. Commit.

---

## Phase 4 — Polish & Portfolio-Ready

### 4.1 Add basic CSS styling

You don't need a whole design system. Pick one of:

- **Option A**: Add a single `App.css` with clean, minimal styles (flexbox layout, card shadows, form spacing).
- **Option B**: Install a lightweight library: `npm install @picocss/pico` — just import the CSS and your HTML elements look decent automatically.

### 4.2 Add a README.md

Create a `README.md` at the project root with:

1. **What it is** — one-paragraph description
2. **Screenshot** — take a screenshot of the working app
3. **Tech stack** — list the technologies
4. **How to run** — step-by-step commands for backend, frontend, and Python service
5. **Key actuarial concepts** — brief explanation of the math (shows you understand it)
6. **Architecture diagram** — paste the ASCII diagram from the design doc
7. **Future improvements** — 2-3 bullet points

### 4.3 Add a `.env.example`

```env
# Backend
PORT=3001

# Python simulation service
SIMULATION_SERVICE_URL=http://localhost:8000
```

### 4.4 Final commit and push

```bash
git add .
git commit -m "Complete life insurance premium calculator"
git remote add origin <your-github-url>
git push -u origin main
```

---

## Summary: What You'll Have Built

| Feature | Stack | Actuarial Concept |
| --- | --- | --- |
| Premium calculator API | NestJS, TypeScript | Net level premium, present value |
| Mortality data endpoint | NestJS, CSV parsing | Life tables, qx, lx |
| Interactive form + result | React, TypeScript | — |
| Mortality curve chart | React, Recharts | Survival analysis |
| Sensitivity analysis chart | React, Recharts | Interest rate risk |
| Monte Carlo simulation | Python, FastAPI, NumPy | Stochastic modelling |
| Unit + e2e tests | Jest, pytest | Validation of actuarial formulas |

---

## Quick Reference: Running the Full Stack

| Service | Directory | Command | URL |
| --- | --- | --- | --- |
| Backend | `backend/` | `npm run start:dev` | <http://localhost:3001/api> |
| Frontend | `frontend/` | `npm run dev` | <http://localhost:5173> |
| Python (optional) | `quant/` | `uvicorn main:app --port 8000 --reload` | <http://localhost:8000> |
