import { useState } from 'react';
import type { FormEvent } from 'react';
import type { PremiumRequest } from '../api/premiumApi';

interface Props {
  onSubmit: (data: PremiumRequest) => void;
  loading: boolean;
}

export function PremiumForm({ onSubmit, loading }: Props) {
  const [age, setAge] = useState(30);
  const [term, setTerm] = useState(20);
  const [sumAssured, setSumAssured] = useState(100000);
  const [interestRatePercent, setInterestRatePercent] = useState(5);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ age, term, sumAssured, interestRate: interestRatePercent / 100 });
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
        Interest Rate (%):
        <input type="number" value={interestRatePercent} min={0.1} max={50} step={0.1}
          onChange={(e) => setInterestRatePercent(Number(e.target.value))} />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? 'Calculating...' : 'Calculate Premium'}
      </button>
    </form>
  );
}