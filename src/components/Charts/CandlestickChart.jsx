import React from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const CandlestickChart = ({ data, symbol, prediction }) => {
  // Process data for Recharts
  const processedData = data.map((item) => ({
    date: new Date(item.Date || item.timestamp).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    }),
    open: item.Open,
    high: item.High,
    low: item.Low,
    close: item.Close,
    volume: item.Volume,
  }));

  // Add prediction point
  if (prediction) {
    const lastDate = new Date(data[data.length - 1].Date || data[data.length - 1].timestamp);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + 1);

    processedData.push({
      date: nextDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      predicted: prediction.predicted_price,
    });
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-slate-300 text-sm font-semibold mb-2">{payload.payload.date}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: ₹{entry.value?.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={500}>
      <ComposedChart data={processedData}>
        <defs>
          <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
        <XAxis
          dataKey="date"
          stroke="#94a3b8"
          style={{ fontSize: '12px', fontFamily: 'Inter' }}
        />
        <YAxis
          stroke="#94a3b8"
          style={{ fontSize: '12px', fontFamily: 'Roboto Mono' }}
          tickFormatter={(value) => `₹${value.toFixed(0)}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px', fontFamily: 'Inter' }}
          iconType="circle"
        />

        {/* Candlestick representation */}
        <Bar dataKey="high" fill="#10b981" opacity={0.6} maxBarSize={8} />
        <Bar dataKey="low" fill="#ef4444" opacity={0.6} maxBarSize={8} />
        
        {/* Close price line */}
        <Line
          type="monotone"
          dataKey="close"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
          fill="url(#colorClose)"
        />

        {/* Prediction line */}
        {prediction && (
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#ec4899"
            strokeWidth={3}
            strokeDasharray="5 5"
            dot={{ r: 6, fill: '#ec4899' }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default CandlestickChart;
