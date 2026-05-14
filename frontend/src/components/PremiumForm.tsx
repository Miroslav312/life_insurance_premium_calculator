import { useState } from 'react';
import type { FormEvent } from 'react';
import type { PremiumRequest } from '../api/premiumApi';

interface Props {
  onSubmit: (data: PremiumRequest) => void;
  loading: boolean;
}

export const DEFAULT_PREMIUM_INPUTS: PremiumRequest = {
  age: 30,
  term: 20,
  sumAssured: 100000,
  interestRate: 0.05,
};

export function PremiumForm({ onSubmit, loading }: Props) {
  const [age, setAge] = useState(DEFAULT_PREMIUM_INPUTS.age);
  const [term, setTerm] = useState(DEFAULT_PREMIUM_INPUTS.term);
  const [sumAssured, setSumAssured] = useState(DEFAULT_PREMIUM_INPUTS.sumAssured);
  const [interestRatePercent, setInterestRatePercent] = useState(
    DEFAULT_PREMIUM_INPUTS.interestRate * 100,
  );

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