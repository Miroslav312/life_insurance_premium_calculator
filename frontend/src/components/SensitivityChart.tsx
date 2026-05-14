import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { SensitivityDataPoint } from '../api/premiumApi';

interface Props {
  data: SensitivityDataPoint[];
}

export function SensitivityChart({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <div>
      <h2>Sensitivity: Premium vs Interest Rate</h2>
      <p style={{ color: '#666', fontSize: 14, marginTop: 0 }}>
        Shows how the calculated annual premium changes as the assumed interest rate varies.
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="interestRate"
            tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
            label={{ value: 'Interest Rate', position: 'insideBottom', offset: -5 }}
          />
          <YAxis label={{ value: 'Annual Premium (£)', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(v) => `£${Number(v).toFixed(2)}`} />
          <Line type="monotone" dataKey="netAnnualPremium" stroke="#2980b9" dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}