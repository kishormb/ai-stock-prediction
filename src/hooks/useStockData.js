import { useState, useEffect } from 'react';
import { stockService } from '../services/stockService';
import { handleApiError } from '../utils/helpers';

export const useStockData = (symbol, autoFetch = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!symbol) return;

    setLoading(true);
    setError(null);

    try {
      const historyData = await stockService.getHistory(symbol);
      const indicators = await stockService.getIndicators(symbol);
      
      setData({
        history: historyData,
        indicators: indicators,
        symbol: symbol,
      });
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error('Error fetching stock data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch && symbol) {
      fetchData();
    }
  }, [symbol, autoFetch]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};
