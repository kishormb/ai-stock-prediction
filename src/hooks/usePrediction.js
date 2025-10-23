import { useState } from 'react';
import { predictionService } from '../services/predictionService';
import { handleApiError } from '../utils/helpers';
import { saveRecentStock } from '../utils/helpers';

export const usePrediction = () => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getPrediction = async (symbol, horizon = 'daily') => {
    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const result = await predictionService.getPrediction(symbol, horizon);
      
      if (result.status === 'success') {
        setPrediction(result);
        saveRecentStock(symbol);
      } else {
        setError(result.message || 'Prediction failed');
      }
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error('Error getting prediction:', err);
    } finally {
      setLoading(false);
    }
  };

  const trainModel = async (symbol) => {
    setLoading(true);
    setError(null);

    try {
      const result = await predictionService.trainModel(symbol);
      return result;
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      console.error('Error training model:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    prediction,
    loading,
    error,
    getPrediction,
    trainModel,
  };
};
