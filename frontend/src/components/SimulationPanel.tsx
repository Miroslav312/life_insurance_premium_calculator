import { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { runSimulation } from '../api/premiumApi';
import type { PremiumRequest, SimulationResponse } from '../api/premiumApi';

interface Props {
  inputs: PremiumRequest | null;
}

const formatCurrency = (value: number) =>
  `£${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function SimulationPanel({ inputs }: Props) {
  const [numSimulations, setNumSimulations] = useState<number>(10000);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reroll, setReroll] = useState(0);

  useEffect(() => {
    if (!inputs) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await runSimulation({ ...inputs, numSimulations });
        if (!cancelled) setResult(response.data);
      } catch (err) {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 503) {
          setError('Simulation service unavailable. Start the Python service: cd quant && uvicorn main:app --port 8000');
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [inputs, numSimulations, reroll]);

  if (!inputs) {
    return <p>Calculate a premium first to enable simulation.</p>;
  }

  const chartData = result?.histogram.map((bucket) => ({
    ...bucket,
    bucketLabel: `£${Math.round(bucket.bucketMin).toLocaleString()}`,
  }));

  return (
    <div className="card">
      <h2>Monte Carlo Simulation</h2>
      <p className="section-hint">
        Simulates N policyholders year-by-year. Each year a random draw against qx determines whether the insurer pays out; surviving policies pay nothing.
      </p>
      <div className="sim-controls">
        <label>
          Simulations:{' '}
          <select
            value={numSimulations}
            onChange={(e) => setNumSimulations(Number(e.target.value))}
            disabled={loading}
          >
            <option value={1000}>1,000</option>
            <option value={10000}>10,000</option>
            <option value={50000}>50,000</option>
          </select>
        </label>
        <button onClick={() => setReroll((r) => r + 1)} disabled={loading || inputs === null}>
          {loading ? 'Running...' : 'Re-run'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {result && chartData && (
        <>
          <div className="stats-row">
            <div>
              <strong>Mean payout:</strong> {formatCurrency(result.meanPayout)}
            </div>
            <div>
              <strong>Median:</strong> {formatCurrency(result.medianPayout)}
            </div>
            <div>
              <strong>5th percentile:</strong> {formatCurrency(result.percentile5)}
            </div>
            <div>
              <strong>95th percentile:</strong> {formatCurrency(result.percentile95)}
            </div>
            <div>
              <strong>Proportion claimed:</strong> {(result.proportionClaimed * 100).toFixed(2)}%
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucketLabel" />
              <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="count" fill="#27ae60" />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
