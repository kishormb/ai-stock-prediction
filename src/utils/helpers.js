import { format, parseISO } from 'date-fns';

/**
 * Format currency in INR
 */
export const formatCurrency = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return `₹${parseFloat(value).toFixed(decimals)}`;
};

/**
 * Format percentage
 */
export const formatPercent = (value, decimals = 2, includeSign = true) => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  const formatted = parseFloat(value).toFixed(decimals);
  const sign = includeSign && value >= 0 ? '+' : '';
  return `${sign}${formatted}%`;
};

/**
 * Format large numbers (e.g., volume)
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  
  if (value >= 10000000) {
    return `${(value / 10000000).toFixed(2)} Cr`;
  } else if (value >= 100000) {
    return `${(value / 100000).toFixed(2)} L`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} K`;
  }
  
  return value.toLocaleString('en-IN');
};

/**
 * Format date
 */
export const formatDate = (dateString, formatStr = 'MMM dd, yyyy') => {
  if (!dateString) return 'N/A';
  
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    return format(date, formatStr);
  } catch (error) {
    return dateString;
  }
};

/**
 * Format datetime
 */
export const formatDateTime = (dateString) => {
  return formatDate(dateString, 'MMM dd, yyyy HH:mm');
};

/**
 * Transform historical data from backend format to chart format
 */
export const transformHistoricalData = (data) => {
  if (!Array.isArray(data)) return [];
  
  return data.map((item) => ({
    date: item.Date || item.timestamp || item.index,
    open: parseFloat(item.Open),
    high: parseFloat(item.High),
    low: parseFloat(item.Low),
    close: parseFloat(item.Close),
    volume: parseFloat(item.Volume),
    rsi: item.RSI ? parseFloat(item.RSI) : null,
    macd: item.MACD ? parseFloat(item.MACD) : null,
    macd_signal: item.MACD_Signal ? parseFloat(item.MACD_Signal) : null,
    ema_12: item.EMA_12 ? parseFloat(item.EMA_12) : null,
    ema_26: item.EMA_26 ? parseFloat(item.EMA_26) : null,
    sma_50: item.SMA_50 ? parseFloat(item.SMA_50) : null,
    bb_upper: item.BB_Upper ? parseFloat(item.BB_Upper) : null,
    bb_lower: item.BB_Lower ? parseFloat(item.BB_Lower) : null,
  }));
};

/**
 * Get color for price change
 */
export const getPriceChangeColor = (change) => {
  if (change > 0) return 'text-green-400';
  if (change < 0) return 'text-red-400';
  return 'text-slate-400';
};

/**
 * Get color for recommendation
 */
export const getRecommendationColor = (recommendation) => {
  switch (recommendation) {
    case 'BUY':
      return 'text-green-400';
    case 'SELL':
      return 'text-red-400';
    case 'HOLD':
      return 'text-yellow-400';
    default:
      return 'text-slate-400';
  }
};

/**
 * Truncate text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Validate symbol format
 */
export const isValidSymbol = (symbol) => {
  return /^[A-Z0-9&]+\.NS$/.test(symbol);
};

/**
 * Calculate simple moving average
 */
export const calculateSMA = (data, period) => {
  if (data.length < period) return null;
  
  const sum = data.slice(-period).reduce((acc, val) => acc + val, 0);
  return sum / period;
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Get recent stocks from localStorage
 */
export const getRecentStocks = () => {
  try {
    const recent = localStorage.getItem('recentStocks');
    return recent ? JSON.parse(recent) : [];
  } catch {
    return [];
  }
};

/**
 * Save recent stock to localStorage
 */
export const saveRecentStock = (symbol) => {
  try {
    const recent = getRecentStocks();
    const updated = [symbol, ...recent.filter((s) => s !== symbol)].slice(0, 10);
    localStorage.setItem('recentStocks', JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving recent stock:', error);
  }
};

/**
 * Handle API error
 */
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error
    return error.response.data?.message || error.response.statusText || 'Server error';
  } else if (error.request) {
    // Request made but no response
    return 'No response from server. Please check your connection.';
  } else {
    // Other errors
    return error.message || 'An unexpected error occurred';
  }
};
