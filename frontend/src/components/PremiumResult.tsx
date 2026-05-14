
import type { PremiumResponse } from '../api/premiumApi';

interface Props {
  result: PremiumResponse | null;
}

export function PremiumResult({ result }: Props) {
  if (!result) return null;

  return (
    <div className="card">
      <h3>Result</h3>
      <p className="section-hint">
        Ax is the present value of a €1 death benefit; äx is the present value of a €1/year survival-contingent annuity. The premium equals (Ax / äx) × sum assured.
      </p>
      <p><strong>Net Annual Premium:</strong> €{result.netAnnualPremium.toLocaleString()}</p>
      <p><strong>Present Value of Benefit (Ax):</strong> {result.ax.toFixed(5)}</p>
      <p><strong>Annuity Factor (äx):</strong> {result.annuityDue.toFixed(5)}</p>
    </div>
  );
}