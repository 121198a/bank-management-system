import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-banking-card border border-gray-100 dark:border-banking-border rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="text-xs">
          {entry.name}: ₹{Number(entry.value).toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
};


const VolumeChart = ({ data = [], title = 'Transaction Volume' }) => {
  const { isDark } = useTheme();

  const grouped = {};
  data.forEach(({ _id, totalAmount }) => {
    const date = _id?.date || 'Unknown';
    const type = _id?.type || 'other';
    if (!grouped[date]) grouped[date] = { date };
    grouped[date][type] = totalAmount;
  });

  const chartData = Object.values(grouped).map((d) => ({
    date: d.date,
    Deposit: d.deposit || 0,
    Withdrawal: d.withdraw || 0,
    'Transfer Out': d.transfer_out || 0
  }));

  const gridColor = isDark ? '#334155' : '#f1f5f9';
  const axisColor = isDark ? '#64748b' : '#94a3b8';

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorDeposit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorWithdraw" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false}
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Area type="monotone" dataKey="Deposit" stroke="#16a34a" fill="url(#colorDeposit)" strokeWidth={2} />
          <Area type="monotone" dataKey="Withdrawal" stroke="#dc2626" fill="url(#colorWithdraw)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VolumeChart;
