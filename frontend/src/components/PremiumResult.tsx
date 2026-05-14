
import type { PremiumResponse } from '../api/premiumApi';

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