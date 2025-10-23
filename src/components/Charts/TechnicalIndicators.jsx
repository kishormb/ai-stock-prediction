import React from 'react';
import { formatCurrency } from '../../utils/helpers';
import { TrendingUp, Activity } from 'lucide-react';

const TechnicalIndicators = ({ indicators }) => {
  if (!indicators) {
    return (
      <div className="text-center text-slate-400 py-8">
        No indicators available
      </div>
    );
  }

  const indicatorData = [
    {
      name: 'RSI (14)',
      value: indicators.rsi?.toFixed(2) || 'N/A',
      status: indicators.rsi > 70 ? 'Overbought' : indicators.rsi < 30 ? 'Oversold' : 'Neutral',
      color: indicators.rsi > 70 ? 'text-red-400' : indicators.rsi < 30 ? 'text-green-400' : 'text-yellow-400',
    },
    {
      name: 'MACD',
      value: indicators.macd?.toFixed(4) || 'N/A',
      status: indicators.macd > indicators.macd_signal ? 'Bullish' : 'Bearish',
      color: indicators.macd > indicators.macd_signal ? 'text-green-400' : 'text-red-400',
    },
    {
      name: 'EMA 12',
      value: formatCurrency(indicators.ema_12),
      status: 'Moving Avg',
      color: 'text-blue-400',
    },
    {
      name: 'EMA 26',
      value: formatCurrency(indicators.ema_26),
      status: 'Moving Avg',
      color: 'text-purple-400',
    },
    {
      name: 'SMA 50',
      value: formatCurrency(indicators.sma_50),
      status: 'Moving Avg',
      color: 'text-cyan-400',
    },
    {
      name: 'ADX',
      value: indicators.adx?.toFixed(2) || 'N/A',
      status: indicators.adx > 25 ? 'Strong Trend' : 'Weak Trend',
      color: indicators.adx > 25 ? 'text-green-400' : 'text-yellow-400',
    },
    {
      name: 'ATR',
      value: indicators.atr?.toFixed(2) || 'N/A',
      status: 'Volatility',
      color: 'text-orange-400',
    },
    {
      name: 'Volume Ratio',
      value: indicators.volume_ratio?.toFixed(2) || 'N/A',
      status: indicators.volume_ratio > 1 ? 'Above Avg' : 'Below Avg',
      color: indicators.volume_ratio > 1 ? 'text-green-400' : 'text-red-400',
    },
  ];

  return (
    <div className="space-y-3">
      {indicatorData.map((indicator, index) => (
        <div
          key={index}
          className="group bg-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 hover:border-indigo-500/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                <Activity className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">{indicator.name}</p>
                <p className={`text-xs font-medium ${indicator.color}`}>
                  {indicator.status}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold font-mono text-slate-100">
                {indicator.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TechnicalIndicators;
