import React, { useState, useEffect } from 'react';
import { stockService } from '../../services/stockService';
import { predictionService } from '../../services/predictionService';
import MetricCard from '../Cards/MetricCard';
import RecommendationCard from '../Cards/RecommendationCard';
import CandlestickChart from '../Charts/CandlestickChart';
import NewsCard from '../Cards/NewsCard';
import LoadingSpinner from '../Common/LoadingSpinner';
import Button from '../Common/Button';
import { TrendingUp, Activity } from 'lucide-react';

const LivePredictions = () => {
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState('');
  const [horizon, setHorizon] = useState('daily');
  const [prediction, setPrediction] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch stocks on mount
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const data = await stockService.getAllStocks();
        setStocks(data);
        if (data.length > 0) {
          setSelectedStock(data.symbol);
        }
      } catch (error) {
        console.error('Error fetching stocks:', error);
      }
    };
    fetchStocks();
  }, []);

  // Fetch prediction
  const handlePredict = async () => {
    if (!selectedStock) return;

    setLoading(true);
    try {
      const [predData, histData, newsData] = await Promise.all([
        predictionService.getPrediction(selectedStock, horizon),
        stockService.getHistory(selectedStock),
        stockService.getNews(selectedStock),
      ]);

      setPrediction(predData.status === 'success' ? predData : null);
      setHistoryData(histData);
      setNews(newsData);
    } catch (error) {
      console.error('Error fetching prediction:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Live Stock Predictions
          </h1>
          <p className="mt-2 text-slate-400">
            AI-powered predictions for Indian stocks with technical analysis
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-semibold text-green-400">System Active</span>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Stock Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              📈 Select Stock
            </label>
            <select
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            >
              {stocks.map((stock) => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.symbol}
                </option>
              ))}
            </select>
          </div>

          {/* Horizon Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              ⏱️ Prediction Horizon
            </label>
            <select
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Predict Button */}
          <div className="flex items-end">
            <Button
              onClick={handlePredict}
              loading={loading}
              fullWidth
              variant="primary"
              className="h-12"
            >
              <TrendingUp className="h-5 w-5 mr-2" />
              Get Prediction
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && <LoadingSpinner size="lg" text={`Analyzing ${selectedStock}...`} />}

      {/* Results */}
      {!loading && prediction && (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              label="Current Price"
              value={prediction.current_price}
              format="currency"
            />
            <MetricCard
              label="Predicted Price"
              value={prediction.predicted_price}
              format="currency"
            />
            <MetricCard
              label="Expected Change"
              value={prediction.change_percent}
              delta={prediction.change_percent}
              format="percent"
            />
            <MetricCard
              label="Confidence"
              value={prediction.confidence || 'N/A'}
              format="text"
            />
          </div>

          {/* Recommendation */}
          <RecommendationCard prediction={prediction} />

          {/* Chart */}
          {historyData.length > 0 && (
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">
              <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
                <Activity className="h-6 w-6 text-indigo-400" />
                Advanced Price Chart
              </h2>
              <CandlestickChart
                data={historyData}
                symbol={selectedStock}
                prediction={prediction}
              />
            </div>
          )}

          {/* News Section */}
          {news.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-4">📰 Latest News</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {news.slice(0, 6).map((item, index) => (
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

export default LivePredictions;
