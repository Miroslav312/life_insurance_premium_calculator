import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getMortalityCurve } from '../api/premiumApi';
import type { MortalityCurvePoint } from '../api/premiumApi';

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