import { useState } from 'react';
import { PremiumForm } from './components/PremiumForm';
import { PremiumResult } from './components/PremiumResult';
import { MortalityCurveChart } from './components/MortalityCurveChart';
import { SensitivityChart } from './components/SensitivityChart';
import { SimulationPanel } from './components/SimulationPanel';
import { calculatePremium, getSensitivity } from './api/premiumApi';
import type {
  PremiumRequest,
  PremiumResponse,
  SensitivityDataPoint,
} from './api/premiumApi';

function App() {
  const [result, setResult] = useState<PremiumResponse | null>(null);
  const [sensitivityData, setSensitivityData] = useState<SensitivityDataPoint[]>([]);
  const [lastInputs, setLastInputs] = useState<PremiumRequest | null>(null);
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
      setLastInputs(data);
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
      <SimulationPanel inputs={lastInputs} />
    </div>
  );
}

export default App;