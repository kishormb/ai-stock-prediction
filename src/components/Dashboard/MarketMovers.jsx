import React, { useState, useEffect } from 'react';
import { stockService } from '../../services/stockService';
import LoadingSpinner from '../Common/LoadingSpinner';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { formatCurrency, formatPercent } from '../../utils/helpers';

const MarketMovers = () => {
  const [topStocks, setTopStocks] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [selectedSector, setSelectedSector] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSectors();
    fetchTopStocks();
  }, []);

  const fetchSectors = async () => {
    try {
      const data = await stockService.getSectors();
      setSectors(data);
    } catch (error) {
      console.error('Error fetching sectors:', error);
    }
  };

  const fetchTopStocks = async (sector = null) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://ai-stock-prediction-oseb.onrender.com/top_stocks${sector ? `?sector=${sector}` : ''}`
      );
      const data = await response.json();
      setTopStocks(data.stocks || []);
    } catch (error) {
      console.error('Error fetching top stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSectorChange = (sector) => {
    setSelectedSector(sector);
    fetchTopStocks(sector === 'all' ? null : sector);
  };

  const topGainers = topStocks.filter((s) => s.change_pct > 0).slice(0, 10);
  const topLosers = topStocks.filter((s) => s.change_pct < 0).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Market Movers
          </h1>
          <p className="mt-2 text-slate-400">
            Real-time tracking of top gainers and losers
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <Activity className="h-5 w-5 text-blue-400 animate-pulse" />
          <span className="text-sm font-semibold text-blue-400">Live Data</span>
        </div>
      </div>

      {/* Sector Filter */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <label className="block text-sm font-semibold text-slate-300 mb-3">
          🔍 Filter by Sector
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSectorChange('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              selectedSector === 'all'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Sectors
          </button>
          {sectors.map((sector) => (
            <button
              key={sector}
              onClick={() => handleSectorChange(sector)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                selectedSector === sector
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {sector}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && <LoadingSpinner size="lg" text="Fetching market data..." />}

      {/* Results */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Gainers */}
          <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/10 backdrop-blur-sm border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-green-400">Top Gainers</h2>
                <p className="text-sm text-slate-400">Stocks with highest gains</p>
              </div>
            </div>

            <div className="space-y-3">
              {topGainers.length > 0 ? (
                topGainers.map((stock, index) => (
                  <div
                    key={stock.symbol}
                    className="group bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 hover:border-green-500/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 bg-green-500/20 rounded-full text-green-400 font-bold text-sm">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-100">{stock.symbol}</p>
                          <p className="text-xs text-slate-400">
                            Vol: {(stock.volume / 1000000).toFixed(2)}M
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-lg font-bold text-slate-100">
                          {formatCurrency(stock.price)}
                        </p>
                        <p className="font-mono text-sm font-bold text-green-400">
                          {formatPercent(stock.change_pct)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-400 py-8">No gainers found</p>
              )}
            </div>
          </div>

          {/* Top Losers */}
          <div className="bg-gradient-to-br from-red-900/20 to-rose-900/10 backdrop-blur-sm border border-red-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-red-400">Top Losers</h2>
                <p className="text-sm text-slate-400">Stocks with highest losses</p>
              </div>
            </div>

            <div className="space-y-3">
              {topLosers.length > 0 ? (
                topLosers.map((stock, index) => (
                  <div
                    key={stock.symbol}
                    className="group bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 hover:border-red-500/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 bg-red-500/20 rounded-full text-red-400 font-bold text-sm">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-100">{stock.symbol}</p>
                          <p className="text-xs text-slate-400">
                            Vol: {(stock.volume / 1000000).toFixed(2)}M
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-lg font-bold text-slate-100">
                          {formatCurrency(stock.price)}
                        </p>
                        <p className="font-mono text-sm font-bold text-red-400">
                          {formatPercent(stock.change_pct)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-400 py-8">No losers found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketMovers;
