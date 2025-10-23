// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://ai-stock-prediction-oseb.onrender.com';
export const API_TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT) || 120000;

// Prediction Horizons
export const HORIZONS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
};

export const HORIZON_LABELS = {
  daily: 'Daily (1 Day)',
  weekly: 'Weekly (7 Days)',
  monthly: 'Monthly (30 Days)',
};

// Recommendation Types
export const RECOMMENDATIONS = {
  BUY: 'BUY',
  SELL: 'SELL',
  HOLD: 'HOLD',
};

// Confidence Levels
export const CONFIDENCE_LEVELS = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

// Chart Colors
export const CHART_COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#fbbf24',
  info: '#06b6d4',
  green: {
    light: '#10b981',
    dark: '#059669',
  },
  red: {
    light: '#ef4444',
    dark: '#dc2626',
  },
};

// Technical Indicators
export const INDICATORS = {
  RSI: { name: 'RSI', overbought: 70, oversold: 30 },
  MACD: { name: 'MACD' },
  EMA: { name: 'EMA' },
  SMA: { name: 'SMA' },
  BOLLINGER: { name: 'Bollinger Bands' },
  ADX: { name: 'ADX' },
  ATR: { name: 'ATR' },
};

// Status Messages
export const STATUS_MESSAGES = {
  LOADING: 'Loading...',
  SUCCESS: 'Success',
  ERROR: 'Error occurred',
  NO_DATA: 'No data available',
  MODEL_NOT_FOUND: 'Model not trained yet',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'darkMode',
  RECENT_STOCKS: 'recentStocks',
  FAVORITES: 'favoriteStocks',
};
