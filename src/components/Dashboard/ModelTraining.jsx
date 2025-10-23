import React, { useState, useEffect } from 'react';
import { stockService } from '../../services/stockService';
import { usePrediction } from '../../hooks/usePrediction';
import Button from '../Common/Button';
import LoadingSpinner from '../Common/LoadingSpinner';
import { Settings, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const ModelTraining = () => {
  const [stocks, setStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState('');
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [trainingLogs, setTrainingLogs] = useState([]);
  const { trainModel, loading } = usePrediction();

  useEffect(() => {
    fetchStocks();
  }, []);

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

  const handleTrain = async () => {
    if (!selectedStock) return;

    setTrainingStatus('training');
    addLog(`Starting training for ${selectedStock}...`);
    addLog('Fetching historical data (3 years)...');

    try {
      setTimeout(() => addLog('Processing Daily model...'), 1000);
      setTimeout(() => addLog('Processing Weekly model...'), 5000);
      setTimeout(() => addLog('Processing Monthly model...'), 10000);

      const result = await trainModel(selectedStock);

      if (result.status === 'success') {
        setTrainingStatus('success');
        addLog(`✓ Training completed successfully!`);
        addLog(`Daily: ${result.horizons?.daily?.status || 'completed'}`);
        addLog(`Weekly: ${result.horizons?.weekly?.status || 'completed'}`);
        addLog(`Monthly: ${result.horizons?.monthly?.status || 'completed'}`);
      } else {
        setTrainingStatus('error');
        addLog(`✗ Training failed: ${result.reason || 'Unknown error'}`);
      }
    } catch (error) {
      setTrainingStatus('error');
      addLog(`✗ Training error: ${error.message}`);
    }
  };

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setTrainingLogs((prev) => [...prev, { timestamp, message }]);
  };

  const clearLogs = () => {
    setTrainingLogs([]);
    setTrainingStatus(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">
          Model Training Center
        </h1>
        <p className="mt-2 text-slate-400">
          Train or retrain AI models for specific stocks
        </p>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/10 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-500/20 rounded-lg">
            <Clock className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-blue-400 mb-2">Training Information</h3>
            <ul className="space-y-1 text-sm text-slate-300">
              <li>• Training typically takes 5-15 minutes per stock</li>
              <li>• Models are trained for Daily, Weekly, and Monthly predictions</li>
              <li>• Uses 3 years of historical data</li>
              <li>• BiLSTM neural network architecture</li>
              <li>• Automatic early stopping to prevent overfitting</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Training Controls */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-slate-100 mb-4">Training Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              📈 Select Stock to Train
            </label>
            <select
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
              disabled={loading}
              className="w-full bg-slate-900/80 border border-slate-600 text-slate-100 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {stocks.map((stock) => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.symbol} - {stock.sector}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <Button
              onClick={handleTrain}
              loading={loading}
              disabled={!selectedStock || loading}
              variant="primary"
              fullWidth
            >
              <Settings className="h-5 w-5 mr-2" />
              Start Training
            </Button>
            {trainingLogs.length > 0 && (
              <Button
                onClick={clearLogs}
                variant="secondary"
                disabled={loading}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Training Status */}
      {trainingStatus && (
        <div className={`rounded-xl p-6 border-2 ${
          trainingStatus === 'success'
            ? 'bg-green-900/20 border-green-500/50'
            : trainingStatus === 'error'
            ? 'bg-red-900/20 border-red-500/50'
            : 'bg-yellow-900/20 border-yellow-500/50'
        }`}>
          <div className="flex items-center gap-3">
            {trainingStatus === 'success' && (
              <CheckCircle className="h-8 w-8 text-green-400" />
            )}
            {trainingStatus === 'error' && (
              <AlertCircle className="h-8 w-8 text-red-400" />
            )}
            {trainingStatus === 'training' && (
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-yellow-400 border-t-transparent" />
            )}
            <div>
              <h3 className="text-xl font-bold text-slate-100">
                {trainingStatus === 'success' && 'Training Completed!'}
                {trainingStatus === 'error' && 'Training Failed'}
                {trainingStatus === 'training' && 'Training in Progress...'}
              </h3>
              <p className="text-sm text-slate-400">
                {trainingStatus === 'success' && 'Models are ready for predictions'}
                {trainingStatus === 'error' && 'Please check the logs below'}
                {trainingStatus === 'training' && 'This may take several minutes'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Training Logs */}
      {trainingLogs.length > 0 && (
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-slate-100 mb-4">Training Logs</h3>
          <div className="bg-black/50 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm">
            {trainingLogs.map((log, index) => (
              <div key={index} className="text-slate-300 py-1">
                <span className="text-slate-500">[{log.timestamp}]</span> {log.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && <LoadingSpinner size="lg" text="Training models..." />}
    </div>
  );
};

export default ModelTraining;
