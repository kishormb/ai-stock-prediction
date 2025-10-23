import React, { useState, useEffect } from 'react';
import { stockService } from '../../services/stockService';
import { predictionService } from '../../services/predictionService';
import MetricCard from '../Cards/MetricCard';
import RecommendationCard from '../Cards/RecommendationCard';
import CandlestickChart from '../Charts/CandlestickChart';
import TechnicalIndicators from '../Charts/TechnicalIndicators';
import NewsCard from '../Cards/NewsCard';
import LoadingSpinner from '../Common/LoadingSpinner';
import Button from '../Common/Button';
import { BarChart3, TrendingUp } from 'lucide-react';

const StockAnalysis = () => {
  const [stocks, setStocks] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedStock, setSelectedStock] = useState('');
  const [horizon, setHorizon] = useState('daily');
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch stocks and sectors on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [stocksData, sectorsData] = await Promise.all([
          stockService.getAllStocks(),
          stockService.getSectors(),
        ]);
        setStocks(stocksData);
        setSectors(['All', ...sectorsData]);
        if (stocksData.length > 0) {
          setSelectedStock(stocksData.symbol);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    fetchInitialData();
  }, []);

  // Filter stocks by sector
  const filteredStocks = selectedSector === 'All'
    ? stocks
    : stocks.filter((s) => s.sector === selectedSector);

  // Analyze stock
  const handleAnalyze = async () => {
    if (!selectedStock) return;

    setLoading(true);
    try {
      const [predictionData, historyData, indicatorsData, newsData] = await Promise.all([
        predictionService.getPrediction(selectedStock, horizon),
        stockService.getHistory(selectedStock),
        stockService.getIndicators(selectedStock),
        stockService.getNews(selectedStock),
      ]);

      setAnalysisData({
        prediction: predictionData.status === 'success' ? predictionData : null,
        history: historyData,
        indicators: indicatorsData,
        news: newsData,
      });
    } catch (error) {
      console.error('Error analyzing stock:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Deep Stock Analysis
        </h1>
        <p className="mt-2 text-slate-400">
          Comprehensive technical and fundamental analysis
        </p>
      </div>

      {/* Control Panel */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Sector Filter */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              📁 Sector
            </label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500"
            >
              {sectors.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              📈 Stock
            </label>
            <select
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500"
            >
              {filteredStocks.map((stock) => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.symbol}
                </option>
              ))}
            </select>
          </div>

          {/* Horizon */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              ⏱️ Horizon
            </label>
            <select
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Analyze Button */}
          <div className="flex items-end">
            <Button
              onClick={handleAnalyze}
              loading={loading}
              fullWidth
              variant="primary"
              className="h-12"
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              Analyze
            </Button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && <LoadingSpinner size="lg" text="Performing deep analysis..." />}

      {/* Results */}
      {!loading && analysisData && (
        <>
          {/* Metrics */}
          {analysisData.prediction && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  label="Current Price"
                  value={analysisData.prediction.current_price}
                  format="currency"
                />
                <MetricCard
                  label="Target Price"
                  value={analysisData.prediction.predicted_price}
                  format="currency"
                />
                <MetricCard
                  label="Expected Change"
                  value={analysisData.prediction.change_percent}
                  delta={analysisData.prediction.change_percent}
                  format="percent"
                />
                <MetricCard
                  label="Recommendation"
                  value={analysisData.prediction.recommendation}
                  format="text"
                />
              </div>

              {/* Recommendation Card */}
              <RecommendationCard prediction={analysisData.prediction} />
            </>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Price Chart */}
            {analysisData.history.length > 0 && (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-slate-100 mb-4">Price Chart</h3>
                <CandlestickChart
                  data={analysisData.history}
                  symbol={selectedStock}
                  prediction={analysisData.prediction}
                />
              </div>
            )}

            {/* Technical Indicators */}
            {analysisData.indicators && (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-slate-100 mb-4">Technical Indicators</h3>
                <TechnicalIndicators indicators={analysisData.indicators.indicators} />
              </div>
            )}
          </div>

          {/* News */}
          {analysisData.news.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-4">📰 Latest News</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {analysisData.news.map((item, index) => (
                  <NewsCard key={index} news={item} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StockAnalysis;
