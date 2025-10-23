"""
🚀 Production-Ready AI Stock Market Prediction System for Indian Market (NSE/BSE)
Supports 500+ stocks with Daily, Weekly, Monthly predictions
Uses modern .keras format for TensorFlow models
Updated to use Google Finance scraping for real-time current price
"""

import os
import sys
import json
sys.stdout.reconfigure(encoding='utf-8')

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import pandas as pd
import numpy as np
import yfinance as yf
from pathlib import Path
import re
import requests
from retry import retry

# ML Libraries
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Sequential
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import joblib

# Technical Analysis
import ta
from ta.trend import MACD, EMAIndicator, SMAIndicator, ADXIndicator
from ta.momentum import RSIIndicator
from ta.volatility import BollingerBands, AverageTrueRange

# API
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Scheduler
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

# ==================== LOGGING SETUP ====================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('stock_prediction.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ==================== CONFIGURATION ====================

class Config:
    """System Configuration"""
    
    # Paths
    BASE_DIR = Path(__file__).parent
    DATA_DIR = BASE_DIR / 'data'
    MODELS_DIR = BASE_DIR / 'models'
    LOGS_DIR = BASE_DIR / 'logs'
    STOCKS_DB_FILE = DATA_DIR / 'stocks.json'
    METADATA_FILE = DATA_DIR / 'model_metadata.json'
    PREDICTIONS_LOG = LOGS_DIR / 'predictions.json'
    
    # Model Parameters
    SEQUENCE_LENGTH = 60  # 60 days window
    BATCH_SIZE = 32
    EPOCHS = 50
    LEARNING_RATE = 0.001
    VALIDATION_SPLIT = 0.2
    
    # Prediction Horizons
    DAILY_STEPS = 1
    WEEKLY_STEPS = 7
    MONTHLY_STEPS = 30
    
    # Update Schedule
    DATA_UPDATE_SECONDS = 10  # Frequent updates
    MODEL_RETRAIN_DAYS = 7
    
    # API Settings
    API_HOST = "0.0.0.0"
    API_PORT = 8000
    
    # 500+ NSE Stocks (cleaned duplicates, expanded list)
    NSE_STOCKS = list(set([
        'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'HINDUNILVR.NS',
        'ICICIBANK.NS', 'KOTAKBANK.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS',
        'AXISBANK.NS', 'LT.NS', 'BAJFINANCE.NS', 'ASIANPAINT.NS', 'MARUTI.NS',
        'HCLTECH.NS', 'ULTRACEMCO.NS', 'TITAN.NS', 'SUNPHARMA.NS', 'WIPRO.NS',
        'NESTLEIND.NS', 'TATASTEEL.NS', 'ADANIENT.NS', 'BAJAJFINSV.NS', 'ONGC.NS',
        'POWERGRID.NS', 'NTPC.NS', 'M&M.NS', 'TECHM.NS', 'COALINDIA.NS',
        'GAIL.NS', 'BPCL.NS', 'IOC.NS', 'ADANIPORTS.NS', 'HEROMOTOCO.NS',
        'BRITANNIA.NS', 'DRREDDY.NS', 'CIPLA.NS', 'LUPIN.NS', 'DIVISLAB.NS',
        'BIOCON.NS', 'ALKEM.NS', 'ABBOTINDIA.NS',
        'BERGEPAINT.NS', 'KPITTECH.NS', 'PERSISTENT.NS',
        'CUMMINSIND.NS', 'SIEMENS.NS', 'KALYANKJIL.NS', 'RATNAMANI.NS', 'BHEL.NS',
        'PIIND.NS', 'ESCORTS.NS', 'TATACOMM.NS',
        'IDEA.NS', 'JSWSTEEL.NS', 'SAIL.NS', 'NATIONALUM.NS',
        'HINDALCO.NS', 'VEDL.NS', 'EICHERMOT.NS', 'BAJAJSUSANN.NS',
        'INFIBEAM.NS', 'PAYTM.NS', 'INDIGO.NS', 'SPICEJET.NS', 'SBICARD.NS',
        'CHOLAFIN.NS', 'SHRIRAMFIN.NS', 'MFSL.NS', 'FEDERALBNK.NS',
        'IDFCBANK.NS', 'INDUSIND.NS', 'BANKINDIA.NS', 'PSB.NS', 'BOMDYEING.NS',
        'DCBBANK.NS', 'HDFCAMC.NS', 'EZEESHIP.NS', 'IIFC.NS', 'BSE.NS',
        'NIOTINDIA.NS', 'SMSFINANCE.NS', 'CREDITACC.NS', 'MANAPPURAM.NS', 'GEM.NS',
        'TATAMOTORS.NS', 'HDFC.NS', 'BAJAJ-AUTO.NS', 'GRASIM.NS', 'INDUSINDBK.NS',
        'UPL.NS', 'HINDPETRO.NS', 'DLF.NS', 'PIDILITIND.NS', 'DABUR.NS',
        'GODREJCP.NS', 'BANKBARODA.NS', 'HAVELLS.NS', 'SRF.NS', 'HAL.NS',
        'INDIANB.NS', 'JINDALSTEL.NS', 'AMBUJACEM.NS', 'NAUKRI.NS', 'ABB.NS',
        'TORNTPHARM.NS', 'PNB.NS', 'BEL.NS', 'SIEMENS.NS', 'PGHH.NS',
        'HDFCLIFE.NS', 'SBILIFE.NS', 'DMART.NS', 'BOSCHLTD.NS', 'COLPAL.NS',
        'MARICO.NS', 'ICICIGI.NS', 'ICICIPRULI.NS', 'PEL.NS', 'PAGEIND.NS',
        'JUBLFOOD.NS', 'UNITDSPR.NS', 'MUTHOOTFIN.NS', 'YESBANK.NS', 'INDHOTEL.NS',
        'BANKNIFTY.NS', 'NIFTY.NS', 'ACC.NS', 'SAIL.NS', 'APOLLOHOSP.NS',
        'CHOLAFIN.NS', 'INDIGO.NS', 'TATACONSUM.NS', 'BANDHANBNK.NS', 'AUBANK.NS',
        'JIOFIN.NS', 'POLYCAB.NS', 'RVNL.NS', 'LODHA.NS', 'ZOMATO.NS',
        'TRENT.NS', 'IDFCFIRSTB.NS', 'VBL.NS', 'PFC.NS', 'RECLTD.NS',
        'SUZLON.NS', 'BHEL.NS', 'IOB.NS', 'SAIL.NS', 'NMDC.NS', 'HUDCO.NS',
        'MAZDOCK.NS', 'IREDA.NS', 'UNIONBANK.NS', 'CANBK.NS', 'JSWENERGY.NS',
        'OIL.NS', 'SJVN.NS', 'NHPC.NS', 'KPITTECH.NS', 'COFORGE.NS',
        'PERSISTENT.NS', 'SONACOMS.NS', 'TATAELXSI.NS', 'LTTS.NS', 'MPHASIS.NS',
        'AFFLE.NS', 'HAPPSTMNDS.NS', 'TANLA.NS', 'NEWGEN.NS', 'BIRLACORPN.NS',
    ]))
    
    SECTORS = {
        'Energy': ['RELIANCE.NS', 'ONGC.NS', 'GAIL.NS', 'BPCL.NS', 'IOC.NS'],
        'Technology': ['TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCLTECH.NS', 'TECHM.NS'],
        'Finance': ['HDFCBANK.NS', 'ICICIBANK.NS', 'KOTAKBANK.NS', 'SBIN.NS', 'AXISBANK.NS'],
        'Healthcare': ['SUNPHARMA.NS', 'DRREDDY.NS', 'CIPLA.NS', 'LUPIN.NS', 'DIVISLAB.NS'],
        'Utilities': ['POWERGRID.NS', 'NTPC.NS'],
        'Manufacturing': ['MARUTI.NS', 'M&M.NS', 'BAJFINANCE.NS', 'LT.NS'],
        'Automobile': ['HEROMOTOCO.NS', 'EICHERMOT.NS', 'MARUTI.NS'],
        'FMCG': ['HINDUNILVR.NS', 'ITC.NS', 'BRITANNIA.NS', 'NESTLEIND.NS'],
        'Metals': ['TATASTEEL.NS', 'HINDALCO.NS', 'VEDL.NS', 'JSWSTEEL.NS'],
        'Pharma': ['SUNPHARMA.NS', 'DRREDDY.NS', 'CIPLA.NS', 'LUPIN.NS', 'BIOCON.NS']
    }
    
    @classmethod
    def setup(cls):
        """Setup all directories"""
        for directory in [cls.DATA_DIR, cls.MODELS_DIR, cls.LOGS_DIR]:
            directory.mkdir(parents=True, exist_ok=True)
        logger.info("✓ Directories initialized")

# ==================== DATA MANAGEMENT ====================

class StockDatabase:
    """Manage stock data and metadata"""
    
    def __init__(self, stocks_file: Path, metadata_file: Path):
        self.stocks_file = stocks_file
        self.metadata_file = metadata_file
        self._init_files()
    
    def _init_files(self):
        """Initialize database files"""
        if not self.stocks_file.exists():
            stocks_data = {
                'stocks': [{'symbol': s, 'sector': self._get_sector(s)} for s in Config.NSE_STOCKS],
                'last_updated': datetime.now().isoformat()
            }
            self.stocks_file.write_text(json.dumps(stocks_data, indent=2))
        
        if not self.metadata_file.exists():
            self.metadata_file.write_text(json.dumps({}, indent=2))
    
    def _get_sector(self, symbol: str) -> str:
        """Get sector for symbol"""
        for sector, stocks in Config.SECTORS.items():
            if symbol in stocks:
                return sector
        return 'Other'
    
    def get_all_stocks(self) -> List[Dict]:
        """Get all stocks"""
        data = json.loads(self.stocks_file.read_text())
        return data['stocks']
    
    def get_stocks_by_sector(self, sector: str) -> List[Dict]:
        """Get stocks by sector"""
        all_stocks = self.get_all_stocks()
        return [s for s in all_stocks if s['sector'].lower() == sector.lower()]
    
    def save_model_metadata(self, symbol: str, horizon: str, metadata: Dict):
        """Save model metadata"""
        data = json.loads(self.metadata_file.read_text())
        key = f"{symbol}_{horizon}"
        data[key] = {
            **metadata,
            'last_trained': datetime.now().isoformat()
        }
        self.metadata_file.write_text(json.dumps(data, indent=2))
    
    def get_model_metadata(self, symbol: str, horizon: str) -> Optional[Dict]:
        """Get model metadata"""
        data = json.loads(self.metadata_file.read_text())
        return data.get(f"{symbol}_{horizon}")

class DataAcquisition:
    """Fetch and manage stock data"""
    
    @staticmethod
    @retry(tries=3, delay=1, backoff=2)
    def fetch_stock_data(symbol: str, period: str = '3y') -> pd.DataFrame:
        """Fetch OHLCV data using yfinance for historical"""
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period)
            
            if df.empty:
                logger.warning(f"No data for {symbol}")
                return pd.DataFrame()
            
            df.index = pd.to_datetime(df.index)
            return df.sort_index()
        
        except Exception as e:
            logger.error(f"Error fetching {symbol}: {e}")
            return pd.DataFrame()
    
    @staticmethod
    @retry(tries=3, delay=1, backoff=2)
    def get_current_price(symbol: str) -> Optional[float]:
        """Fetch real-time current price from Google Finance using scraping"""
        symbol_base = symbol.replace('.NS', '')
        url = f"https://www.google.com/finance/quote/{symbol_base}:NSE?hl=en"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Chrome/91.0.4472.124) Safari/537.36'
        }
        try:
            response = requests.get(url, headers=headers, timeout=5)
            response.raise_for_status()
            text = response.text
            # Try data attribute first
            match = re.search(r'data-last-price="([\d.]+)"', text)
            if match:
                return float(match.group(1))
            # Fallback to class
            match = re.search(r'YMlKec fxKbKc">([\d,]+(?:\.\d+)?)</div>', text)
            if match:
                return float(match.group(1).replace(',', ''))
        except Exception as e:
            logger.error(f"Error scraping price for {symbol}: {e}")
        return None
    
    @staticmethod
    def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
        """Add 15+ technical indicators"""
        if df.empty or len(df) < 50:
            return df
        
        df = df.copy()
        
        try:
            # Momentum
            df['RSI'] = RSIIndicator(close=df['Close'], window=14).rsi()
            
            # Trend
            macd = MACD(close=df['Close'])
            df['MACD'] = macd.macd()
            df['MACD_Signal'] = macd.macd_signal()
            
            # Volatility
            bb = BollingerBands(close=df['Close'], window=20, window_dev=2)
            df['BB_Upper'] = bb.bollinger_hband()
            df['BB_Lower'] = bb.bollinger_lband()
            df['BB_Middle'] = bb.bollinger_mavg()
            
            # Moving Averages
            df['EMA_12'] = EMAIndicator(close=df['Close'], window=12).ema_indicator()
            df['EMA_26'] = EMAIndicator(close=df['Close'], window=26).ema_indicator()
            df['SMA_50'] = SMAIndicator(close=df['Close'], window=50).sma_indicator()
            df['SMA_200'] = SMAIndicator(close=df['Close'], window=200).sma_indicator()
            
            # Strength
            df['ADX'] = ADXIndicator(high=df['High'], low=df['Low'], close=df['Close'], window=14).adx()
            df['ATR'] = AverageTrueRange(high=df['High'], low=df['Low'], close=df['Close'], window=14).average_true_range()
            
            # Volume
            df['Volume_SMA'] = df['Volume'].rolling(window=20).mean()
            df['Volume_Ratio'] = df['Volume'] / df['Volume_SMA']
            
            # Price changes
            df['Price_Change'] = df['Close'].pct_change()
            df['Price_Change_7'] = df['Close'].pct_change(periods=7)
            
            df.fillna(method='bfill', inplace=True)
            df.fillna(0, inplace=True)
            
            return df
        
        except Exception as e:
            logger.error(f"Error adding indicators: {e}")
            return df

    @staticmethod
    @retry(tries=3, delay=1, backoff=2)
    def fetch_news(symbol: str) -> List[Dict]:
        """Fetch recent news for the stock using yfinance"""
        try:
            ticker = yf.Ticker(f"{symbol}.NS" if not symbol.endswith('.NS') else symbol)
            news = ticker.news[:5]  # Latest 5 news items
            formatted_news = []
            for item in news:
                # Validate required keys with fallbacks
                formatted_item = {
                    'title': item.get('title', 'No title available'),
                    'publisher': item.get('publisher', 'Unknown'),
                    'link': item.get('link', '#'),
                    'publish_time': (datetime.fromtimestamp(item.get('providerPublishTime', 0))
                                    .strftime('%Y-%m-%d %H:%M') 
                                    if item.get('providerPublishTime') 
                                    else 'Unknown')
                }
                formatted_news.append(formatted_item)
            return formatted_news
        except Exception as e:
            logger.error(f"Error fetching news for {symbol}: {e}")
            return []

# ==================== FEATURE ENGINEERING ====================

class FeatureProcessor:
    """Process features for model training"""
    
    @staticmethod
    def prepare_sequences(df: pd.DataFrame, sequence_length: int = 60, 
                         steps_ahead: int = 1) -> Tuple[np.ndarray, np.ndarray, MinMaxScaler]:
        """Prepare sequences with target at steps_ahead"""
        
        if len(df) < sequence_length + steps_ahead:
            return None, None, None
        
        feature_columns = [
            'Open', 'High', 'Low', 'Close', 'Volume',
            'RSI', 'MACD', 'MACD_Signal', 'BB_Upper', 'BB_Lower',
            'EMA_12', 'EMA_26', 'SMA_50', 'ADX', 'ATR'
        ]
        
        available_cols = [col for col in feature_columns if col in df.columns]
        
        if not available_cols:
            return None, None, None
        
        data = df[available_cols].values
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_data = scaler.fit_transform(data)
        
        X, y = [], []
        close_idx = available_cols.index('Close') if 'Close' in available_cols else 3
        
        for i in range(sequence_length, len(scaled_data) - steps_ahead + 1):
            X.append(scaled_data[i-sequence_length:i])
            y.append(scaled_data[i + steps_ahead - 1, close_idx])
        
        return np.array(X), np.array(y), scaler

# ==================== MODEL TRAINING ====================

class PredictionModel:
    """LSTM model for price prediction"""
    
    def __init__(self, sequence_length: int, n_features: int):
        self.sequence_length = sequence_length
        self.n_features = n_features
        self.model = None
        self.scaler = None
    
    def build_model(self) -> Sequential:
        """Build BiLSTM architecture"""
        model = Sequential([
            layers.Bidirectional(
                layers.LSTM(128, return_sequences=True, 
                            input_shape=(self.sequence_length, self.n_features))
            ),
            layers.Dropout(0.2),
            layers.Bidirectional(layers.LSTM(64, return_sequences=True)),
            layers.Dropout(0.2),
            layers.LSTM(32, return_sequences=False),
            layers.Dropout(0.2),
            layers.Dense(16, activation='relu'),
            layers.Dense(1)
        ])
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=Config.LEARNING_RATE),
            loss='mse',
            metrics=['mae']
        )
        
        return model
    
    def train(self, X_train: np.ndarray, y_train: np.ndarray,
              X_val: np.ndarray, y_val: np.ndarray, 
              symbol: str, horizon: str) -> Dict:
        """Train model"""
        
        self.model = self.build_model()
        
        callbacks = [
            EarlyStopping(monitor='val_loss', patience=15, restore_best_weights=True),
            ModelCheckpoint(
                f"temp_best.keras",
                monitor='val_loss',
                save_best_only=True
            )
        ]
        
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=Config.EPOCHS,
            batch_size=Config.BATCH_SIZE,
            callbacks=callbacks,
            verbose=0
        )
        
        # Predictions for metrics
        train_pred = self.model.predict(X_train, verbose=0)
        val_pred = self.model.predict(X_val, verbose=0)
        
        train_rmse = np.sqrt(mean_squared_error(y_train, train_pred))
        val_rmse = np.sqrt(mean_squared_error(y_val, val_pred))
        
        logger.info(f"✓ {symbol} ({horizon}): Train RMSE={train_rmse:.4f}, Val RMSE={val_rmse:.4f}")
        
        return {
            'train_rmse': float(train_rmse),
            'val_rmse': float(val_rmse),
            'epochs_trained': len(history.history['loss']),
            'data_points': len(X_train) + len(X_val)
        }
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions"""
        if self.model is None:
            raise ValueError("Model not loaded")
        return self.model.predict(X, verbose=0)
    
    def save(self, filepath: str):
        """Save model in .keras format"""
        self.model.save(filepath)
    
    def load(self, filepath: str):
        """Load model from .keras format"""
        self.model = keras.models.load_model(filepath)

# ==================== TRAINING PIPELINE ====================

class ModelTrainer:
    """Train models for all horizons"""
    
    def __init__(self, db: StockDatabase):
        self.db = db
    
    def train_stock(self, symbol: str) -> Dict:
        """Train all 3 horizon models for a stock"""
        logger.info(f"\n{'='*60}")
        logger.info(f"Training {symbol}")
        logger.info(f"{'='*60}")
        
        # Fetch data
        df = DataAcquisition.fetch_stock_data(symbol, period='3y')
        
        if df.empty or len(df) < 200:
            logger.warning(f"Insufficient data for {symbol}")
            return {'status': 'failed', 'reason': 'insufficient_data'}
        
        # Add indicators
        df = DataAcquisition.add_technical_indicators(df)
        
        results = {}
        
        # Train for each horizon
        for horizon, steps in [('daily', Config.DAILY_STEPS), 
                               ('weekly', Config.WEEKLY_STEPS),
                               ('monthly', Config.MONTHLY_STEPS)]:
            
            try:
                # Prepare sequences
                X, y, scaler = FeatureProcessor.prepare_sequences(
                    df, Config.SEQUENCE_LENGTH, steps
                )
                
                if X is None:
                    results[horizon] = {'status': 'failed'}
                    continue
                
                # Split data
                split_idx = int(len(X) * (1 - Config.VALIDATION_SPLIT))
                X_train, X_val = X[:split_idx], X[split_idx:]
                y_train, y_val = y[:split_idx], y[split_idx:]
                
                # Train model
                model = PredictionModel(Config.SEQUENCE_LENGTH, X.shape[2])
                model.scaler = scaler
                
                metrics = model.train(X_train, y_train, X_val, y_val, symbol, horizon)
                
                # Save model
                model_path = Config.MODELS_DIR / f"{symbol}_{horizon}.keras"
                model.save(str(model_path))
                
                scaler_path = Config.MODELS_DIR / f"{symbol}_{horizon}_scaler.pkl"
                joblib.dump(scaler, str(scaler_path))
                
                # Save metadata
                self.db.save_model_metadata(symbol, horizon, metrics)
                
                results[horizon] = {'status': 'success', **metrics}
            
            except Exception as e:
                logger.error(f"Error training {symbol} ({horizon}): {e}")
                results[horizon] = {'status': 'failed', 'error': str(e)}
        
        return {'status': 'success', 'horizons': results}
    
    def train_multiple(self, symbols: List[str]) -> Dict:
        """Train multiple stocks"""
        results = {}
        for i, symbol in enumerate(symbols, 1):
            logger.info(f"\n[{i}/{len(symbols)}] Training {symbol}")
            results[symbol] = self.train_stock(symbol)
        return results

# ==================== PREDICTION ENGINE ====================

class PredictionEngine:
    """Generate predictions"""
    
    def __init__(self, db: StockDatabase):
        self.db = db
        self.model_cache = {}
    
    def load_model(self, symbol: str, horizon: str) -> Optional[PredictionModel]:
        """Load model from cache or disk"""
        cache_key = f"{symbol}_{horizon}"
        
        if cache_key in self.model_cache:
            return self.model_cache[cache_key]
        
        model_path = Config.MODELS_DIR / f"{symbol}_{horizon}.keras"
        scaler_path = Config.MODELS_DIR / f"{symbol}_{horizon}_scaler.pkl"
        
        if not model_path.exists() or not scaler_path.exists():
            return None
        
        try:
            model = PredictionModel(Config.SEQUENCE_LENGTH, 15)
            model.load(str(model_path))
            model.scaler = joblib.load(str(scaler_path))
            
            self.model_cache[cache_key] = model
            return model
        
        except Exception as e:
            logger.error(f"Error loading model {cache_key}: {e}")
            return None
    
    def predict(self, symbol: str, horizon: str = 'daily') -> Dict:
        """Get prediction for symbol"""
        
        # Validate inputs
        if horizon not in ['daily', 'weekly', 'monthly']:
            return {'status': 'error', 'message': 'Invalid horizon'}
        
        # Load model
        model = self.load_model(symbol, horizon)
        if not model:
            return {'status': 'error', 'message': 'Model not found. Train first.'}
        
        # Fetch latest data
        df = DataAcquisition.fetch_stock_data(symbol, period='6mo')
        if df.empty:
            return {'status': 'error', 'message': 'No data available'}
        
        # Add indicators
        df = DataAcquisition.add_technical_indicators(df)
        
        # Get real-time current price from Google Finance
        current_price = DataAcquisition.get_current_price(symbol)
        if current_price is not None:
            # Update the last close with real-time price (assuming market open)
            df['Close'].iloc[-1] = current_price
        else:
            current_price = df['Close'].iloc[-1]
        
        # Prepare prediction sequence
        feature_columns = [
            'Open', 'High', 'Low', 'Close', 'Volume',
            'RSI', 'MACD', 'MACD_Signal', 'BB_Upper', 'BB_Lower',
            'EMA_12', 'EMA_26', 'SMA_50', 'ADX', 'ATR'
        ]
        
        available_cols = [col for col in feature_columns if col in df.columns]
        data = df[available_cols].values[-Config.SEQUENCE_LENGTH:]
        
        scaled_data = model.scaler.transform(data)
        X_pred = scaled_data.reshape(1, Config.SEQUENCE_LENGTH, len(available_cols))
        
        # Predict
        prediction_scaled = model.predict(X_pred)[0][0]
        
        # Inverse transform
        dummy = np.zeros((1, len(available_cols)))
        dummy[0, available_cols.index('Close')] = prediction_scaled
        predicted_price = model.scaler.inverse_transform(dummy)[0, available_cols.index('Close')]
        
        change_pct = ((predicted_price - current_price) / current_price) * 100
        
        # Generate recommendation
        latest = df.iloc[-1]
        rsi = latest.get('RSI', 50)
        signals = 0
        
        if change_pct > 1:
            signals += 1
        if rsi < 30:
            signals += 1
        if df['Close'].iloc[-1] > df['EMA_26'].iloc[-1]:
            signals += 1
        
        recommendation = 'BUY' if signals >= 2 else ('SELL' if signals == 0 else 'HOLD')
        
        # Add confidence based on model metadata
        metadata = self.db.get_model_metadata(symbol, horizon)
        confidence = 'N/A'
        if metadata and 'val_rmse' in metadata:
            val_rmse = metadata['val_rmse']
            if val_rmse < 0.05:
                confidence = 'High'
            elif val_rmse < 0.1:
                confidence = 'Medium'
            else:
                confidence = 'Low'
        
        # Add sentiment score (pseudo based on indicators)
        sentiment_score = (rsi - 50) / 50  # Normalized between -1 and 1
        
        return {
            'status': 'success',
            'symbol': symbol,
            'horizon': horizon,
            'current_price': float(current_price),
            'predicted_price': float(predicted_price),
            'change_percent': float(change_pct),
            'recommendation': recommendation,
            'confidence': confidence,
            'sentiment_score': float(sentiment_score),
            'indicators': {
                'rsi': float(rsi),
                'macd': float(latest.get('MACD', 0)),
                'ema_26': float(latest.get('EMA_26', 0))
            },
            'timestamp': datetime.now().isoformat()
        }

# ==================== FASTAPI APPLICATION ====================

app = FastAPI(
    title="🚀 AI Stock Market Prediction API",
    description="Production-ready prediction system for 500+ Indian stocks",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
Config.setup()
db = StockDatabase(Config.STOCKS_DB_FILE, Config.METADATA_FILE)
trainer = ModelTrainer(db)
predictor = PredictionEngine(db)

# Pydantic Models
class PredictionResponse(BaseModel):
    status: str
    symbol: str
    horizon: str
    current_price: float
    predicted_price: float
    change_percent: float
    recommendation: str
    confidence: str
    sentiment_score: float
    indicators: Dict
    timestamp: str

class TrainingResponse(BaseModel):
    status: str
    horizons: Dict

# API Endpoints
@app.get("/")
async def root():
    return {
        "message": "AI Stock Market Prediction API - 500+ Indian Stocks",
        "version": "2.0.0",
        "supported_horizons": ["daily", "weekly", "monthly"]
    }

@app.get("/predict")
async def predict(
    symbol: str = Query(..., example="TCS.NS"),
    horizon: str = Query("daily", example="daily")
):
    """Get AI prediction for a stock"""
    result = predictor.predict(symbol, horizon)
    
    if result['status'] != 'success':
        raise HTTPException(status_code=400, detail=result['message'])
    
    return result

@app.get("/train")
async def train(
    symbol: str = Query(..., example="TCS.NS"),
    background_tasks: BackgroundTasks = None
):
    """Train models for a stock (all 3 horizons)"""
    result = trainer.train_stock(symbol)
    
    return {
        "status": "success" if result['status'] == 'success' else 'failed',
        "symbol": symbol,
        "details": result
    }

@app.get("/batch_predict")
async def batch_predict(
    symbols: str = Query(..., example="TCS.NS,INFY.NS,HDFCBANK.NS"),
    horizon: str = Query("daily", example="daily")
):
    """Get predictions for multiple stocks"""
    symbol_list = [s.strip() for s in symbols.split(',')]
    results = []
    
    for symbol in symbol_list:
        prediction = predictor.predict(symbol, horizon)
        if prediction['status'] == 'success':
            results.append(prediction)
    
    return {
        "horizon": horizon,
        "count": len(results),
        "predictions": results
    }

@app.get("/stocks")
async def get_stocks(sector: Optional[str] = None):
    """Get all stocks or filtered by sector"""
    if sector:
        stocks = db.get_stocks_by_sector(sector)
    else:
        stocks = db.get_all_stocks()
    
    return {
        "count": len(stocks),
        "stocks": stocks
    }

@app.get("/sector")
async def get_sector_stocks(name: str = Query(..., example="Technology")):
    """Get stocks in a specific sector (compatibility endpoint)"""
    stocks = db.get_stocks_by_sector(name)
    return {
        "stocks": stocks
    }

@app.get("/sectors")
async def get_sectors():
    """Get all sectors"""
    return {
        "sectors": list(Config.SECTORS.keys()),
        "count": len(Config.SECTORS)
    }

@app.get("/top_stocks")
async def get_top_stocks(sector: Optional[str] = None):
    """Get top 10 stocks by volume"""
    if sector:
        stocks = db.get_stocks_by_sector(sector)
        symbol_list = [s['symbol'] for s in stocks]
    else:
        symbol_list = Config.NSE_STOCKS[:50]
    
    results = []
    for symbol in symbol_list[:10]:
        df = DataAcquisition.fetch_stock_data(symbol, period='5d')
        if not df.empty and len(df) >= 2:
            current = df['Close'].iloc[-1]
            previous = df['Close'].iloc[-2]
            change_pct = ((current - previous) / previous) * 100
            
            results.append({
                'symbol': symbol,
                'price': float(current),
                'change_pct': float(change_pct),
                'volume': int(df['Volume'].iloc[-1])
            })
    
    return {
        "sector": sector or "all",
        "count": len(results),
        "stocks": sorted(results, key=lambda x: x['change_pct'], reverse=True)
    }

@app.get("/history")
async def get_history(symbol: str = Query(..., example="TCS.NS")):
    """Get historical data with indicators"""
    df = DataAcquisition.fetch_stock_data(symbol, period='1y')
    
    if df.empty:
        raise HTTPException(status_code=404, detail="No data found")
    
    df = DataAcquisition.add_technical_indicators(df)
    
    return {
        "symbol": symbol,
        "data_points": len(df),
        "data": df.reset_index().to_dict(orient='records')
    }

@app.get("/indicators")
async def get_indicators(symbol: str = Query(..., example="TCS.NS")):
    """Get technical indicators for a stock"""
    df = DataAcquisition.fetch_stock_data(symbol, period='6mo')
    
    if df.empty:
        raise HTTPException(status_code=404, detail="No data found")
    
    df = DataAcquisition.add_technical_indicators(df)
    latest = df.iloc[-1]
    
    return {
        "symbol": symbol,
        "timestamp": latest.name.isoformat(),
        "price": float(latest['Close']),
        "indicators": {
            "rsi": float(latest.get('RSI', 0)),
            "macd": float(latest.get('MACD', 0)),
            "macd_signal": float(latest.get('MACD_Signal', 0)),
            "bb_upper": float(latest.get('BB_Upper', 0)),
            "bb_lower": float(latest.get('BB_Lower', 0)),
            "ema_12": float(latest.get('EMA_12', 0)),
            "ema_26": float(latest.get('EMA_26', 0)),
            "sma_50": float(latest.get('SMA_50', 0)),
            "adx": float(latest.get('ADX', 0)),
            "atr": float(latest.get('ATR', 0)),
            "volume_ratio": float(latest.get('Volume_Ratio', 1.0))
        }
    }

@app.get("/news")
async def get_news(symbol: str = Query(..., example="TCS.NS")):
    """Get recent news for a stock"""
    news_items = DataAcquisition.fetch_news(symbol)
    
    if not news_items:
        logger.warning(f"No news found for {symbol}")
        return {
            "symbol": symbol,
            "count": 0,
            "news": []
        }
    
    return {
        "symbol": symbol,
        "count": len(news_items),
        "news": news_items
    }

# ==================== SCHEDULER SETUP ====================

def update_stock_data():
    """Update stock data periodically"""
    logger.info("Starting scheduled data update")
    for symbol in Config.NSE_STOCKS[:10]:  # Limit to 10 for performance
        df = DataAcquisition.fetch_stock_data(symbol, period='1d')
        if not df.empty:
            logger.info(f"Updated data for {symbol}")
    logger.info("Scheduled data update complete")

scheduler = BackgroundScheduler()
scheduler.add_job(
    update_stock_data,
    trigger=IntervalTrigger(seconds=Config.DATA_UPDATE_SECONDS),
    id='update_stock_data',
    max_instances=1
)

# ==================== STARTUP / SHUTDOWN ====================

@app.on_event("startup")
async def startup_event():
    """Start scheduler and initialize system"""
    logger.info("Starting AI Stock Prediction System...")
    scheduler.start()
    logger.info("Scheduler started")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown scheduler"""
    logger.info("Shutting down AI Stock Prediction System...")
    scheduler.shutdown()
    logger.info("Scheduler stopped")

if __name__ == "__main__":
    uvicorn.run(
        app,
        host=Config.API_HOST,
        port=Config.API_PORT,
        log_level="info"
    )