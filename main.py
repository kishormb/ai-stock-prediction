"""
🚀 Production-Ready AI Stock Prediction API for Render
Optimized for cold starts, persistent storage, and scalability
"""

import os
import sys
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional
import pandas as pd
import numpy as np
import yfinance as yf
from pathlib import Path
import re
import requests
from functools import lru_cache
import joblib

# ML Libraries (lightweight for Render)
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Sequential
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error

# Technical Analysis
import ta
from ta.trend import MACD, EMAIndicator, SMAIndicator, ADXIndicator
from ta.momentum import RSIIndicator
from ta.volatility import BollingerBands, AverageTrueRange

# FastAPI
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# ==================== RENDER CONFIGURATION ====================
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Reduce TensorFlow logs
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Optimize for Render

# ==================== LOGGING SETUP (Render Compatible) ====================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ==================== CONFIGURATION ====================
class Config:
    """Render-optimized configuration"""
    
    # Render persistent storage
    BASE_DIR = Path("/tmp")  # Render uses /tmp for persistent storage
    DATA_DIR = BASE_DIR / 'data'
    MODELS_DIR = BASE_DIR / 'models'
    LOGS_DIR = BASE_DIR / 'logs'
    
    STOCKS_DB_FILE = DATA_DIR / 'stocks.json'
    METADATA_FILE = DATA_DIR / 'model_metadata.json'
    
    # Model Parameters (reduced for faster cold starts)
    SEQUENCE_LENGTH = 60
    BATCH_SIZE = 16  # Reduced for memory
    EPOCHS = 30      # Reduced for faster training
    LEARNING_RATE = 0.001
    VALIDATION_SPLIT = 0.2
    
    # Prediction Horizons
    DAILY_STEPS = 1
    WEEKLY_STEPS = 7
    MONTHLY_STEPS = 30
    
    # Top 50 popular stocks for pre-training
    POPULAR_STOCKS = [
        'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'HINDUNILVR.NS',
        'ICICIBANK.NS', 'KOTAKBANK.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS',
        'AXISBANK.NS', 'LT.NS', 'BAJFINANCE.NS', 'ASIANPAINT.NS', 'MARUTI.NS',
        'HCLTECH.NS', 'ULTRACEMCO.NS', 'TITAN.NS', 'SUNPHARMA.NS', 'WIPRO.NS',
        'NESTLEIND.NS', 'TATASTEEL.NS', 'ADANIENT.NS', 'BAJAJFINSV.NS', 'ONGC.NS',
        'POWERGRID.NS', 'NTPC.NS', 'M&M.NS', 'TECHM.NS', 'COALINDIA.NS',
        'GAIL.NS', 'BPCL.NS', 'IOC.NS', 'ADANIPORTS.NS', 'HEROMOTOCO.NS',
        'BRITANNIA.NS', 'DRREDDY.NS', 'CIPLA.NS', 'LUPIN.NS', 'DIVISLAB.NS'
    ]
    
    SECTORS = {
        'Energy': ['RELIANCE.NS', 'ONGC.NS', 'GAIL.NS', 'BPCL.NS', 'IOC.NS'],
        'Technology': ['TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCLTECH.NS', 'TECHM.NS'],
        'Finance': ['HDFCBANK.NS', 'ICICIBANK.NS', 'KOTAKBANK.NS', 'SBIN.NS', 'AXISBANK.NS'],
        'Healthcare': ['SUNPHARMA.NS', 'DRREDDY.NS', 'CIPLA.NS', 'LUPIN.NS', 'DIVISLAB.NS'],
        'FMCG': ['HINDUNILVR.NS', 'ITC.NS', 'BRITANNIA.NS', 'NESTLEIND.NS'],
        'Auto': ['MARUTI.NS', 'M&M.NS', 'HEROMOTOCO.NS']
    }
    
    @classmethod
    def setup(cls):
        """Setup directories for Render"""
        for directory in [cls.DATA_DIR, cls.MODELS_DIR, cls.LOGS_DIR]:
            directory.mkdir(parents=True, exist_ok=True)
        logger.info("✓ Render directories initialized")

# ==================== STOCK DATABASE ====================
class StockDatabase:
    def __init__(self):
        self.stocks_file = Config.STOCKS_DB_FILE
        self.metadata_file = Config.METADATA_FILE
        self._init_files()
    
    def _init_files(self):
        if not self.stocks_file.exists():
            stocks_data = {
                'stocks': [{'symbol': s, 'sector': self._get_sector(s)} for s in Config.POPULAR_STOCKS],
                'last_updated': datetime.now().isoformat()
            }
            self.stocks_file.write_text(json.dumps(stocks_data, indent=2))
        
        if not self.metadata_file.exists():
            self.metadata_file.write_text(json.dumps({}, indent=2))
    
    def _get_sector(self, symbol: str) -> str:
        for sector, stocks in Config.SECTORS.items():
            if symbol in stocks:
                return sector
        return 'Other'
    
    def get_all_stocks(self) -> List[Dict]:
        data = json.loads(self.stocks_file.read_text())
        return data['stocks']
    
    def get_stocks_by_sector(self, sector: str) -> List[Dict]:
        all_stocks = self.get_all_stocks()
        return [s for s in all_stocks if s['sector'].lower() == sector.lower()]
    
    def save_model_metadata(self, symbol: str, horizon: str, metadata: Dict):
        data = json.loads(self.metadata_file.read_text())
        key = f"{symbol}_{horizon}"
        data[key] = {**metadata, 'last_trained': datetime.now().isoformat()}
        self.metadata_file.write_text(json.dumps(data, indent=2))
    
    def get_model_metadata(self, symbol: str, horizon: str) -> Optional[Dict]:
        try:
            data = json.loads(self.metadata_file.read_text())
            return data.get(f"{symbol}_{horizon}")
        except:
            return None

# ==================== DATA ACQUISITION ====================
class DataAcquisition:
    @staticmethod
    def fetch_stock_data(symbol: str, period: str = '1y') -> pd.DataFrame:
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period)
            if df.empty:
                return pd.DataFrame()
            df.index = pd.to_datetime(df.index)
            return df.sort_index()
        except Exception as e:
            logger.error(f"Error fetching {symbol}: {e}")
            return pd.DataFrame()
    
    @staticmethod
    def get_current_price(symbol: str) -> Optional[float]:
        try:
            symbol_base = symbol.replace('.NS', '')
            url = f"https://www.google.com/finance/quote/{symbol_base}:NSE"
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            response = requests.get(url, headers=headers, timeout=10)
            text = response.text
            
            # Multiple regex patterns for reliability
            patterns = [
                r'data-last-price="([\d.]+)"',
                r'YMlKec fxKbKc">([\d,]+(?:\.\d+)?)',
                r'P6K39c">\Rs([\d,]+(?:\.\d+)?)'
            ]
            
            for pattern in patterns:
                match = re.search(pattern, text)
                if match:
                    price_str = match.group(1).replace(',', '')
                    return float(price_str)
        except:
            pass
        return None
    
    @staticmethod
    def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
        if df.empty or len(df) < 50:
            return df
        
        df = df.copy()
        try:
            # Core indicators only (memory optimized)
            df['RSI'] = RSIIndicator(close=df['Close'], window=14).rsi()
            macd = MACD(close=df['Close'])
            df['MACD'] = macd.macd()
            df['MACD_Signal'] = macd.macd_signal()
            bb = BollingerBands(close=df['Close'], window=20)
            df['BB_Upper'] = bb.bollinger_hband()
            df['BB_Lower'] = bb.bollinger_lband()
            df['EMA_12'] = EMAIndicator(close=df['Close'], window=12).ema_indicator()
            df['EMA_26'] = EMAIndicator(close=df['Close'], window=26).ema_indicator()
            df['SMA_50'] = SMAIndicator(close=df['Close'], window=50).sma_indicator()
            df['ADX'] = ADXIndicator(high=df['High'], low=df['Low'], close=df['Close']).adx()
            
            df.fillna(method='bfill', inplace=True)
            df.fillna(0, inplace=True)
            return df
        except Exception as e:
            logger.error(f"Error adding indicators: {e}")
            return df

# ==================== MODEL SYSTEM ====================
class PredictionModel:
    def __init__(self, sequence_length: int = 60, n_features: int = 10):
        self.sequence_length = sequence_length
        self.n_features = n_features
        self.model = None
        self.scaler = None
    
    def build_model(self) -> Sequential:
        model = Sequential([
            layers.LSTM(64, return_sequences=True, input_shape=(self.sequence_length, self.n_features)),
            layers.Dropout(0.2),
            layers.LSTM(32, return_sequences=False),
            layers.Dropout(0.2),
            layers.Dense(16, activation='relu'),
            layers.Dense(1)
        ])
        model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        return model
    
    @lru_cache(maxsize=128)
    def predict(self, X: np.ndarray) -> np.ndarray:
        if self.model is None:
            raise ValueError("Model not loaded")
        return self.model.predict(X, verbose=0)

# ==================== PREDICTION ENGINE ====================
class PredictionEngine:
    def __init__(self, db: StockDatabase):
        self.db = db
        self.model_cache = {}
    
    def load_model(self, symbol: str, horizon: str) -> Optional[PredictionModel]:
        cache_key = f"{symbol}_{horizon}"
        if cache_key in self.model_cache:
            return self.model_cache[cache_key]
        
        model_path = Config.MODELS_DIR / f"{symbol}_{horizon}.keras"
        scaler_path = Config.MODELS_DIR / f"{symbol}_{horizon}_scaler.pkl"
        
        if not model_path.exists() or not scaler_path.exists():
            return None
        
        try:
            model = PredictionModel()
            model.model = keras.models.load_model(str(model_path))
            model.scaler = joblib.load(str(scaler_path))
            self.model_cache[cache_key] = model
            return model
        except Exception as e:
            logger.error(f"Error loading model {cache_key}: {e}")
            return None
    
    def predict(self, symbol: str, horizon: str = 'daily') -> Dict:
        if horizon not in ['daily', 'weekly', 'monthly']:
            return {'status': 'error', 'message': 'Invalid horizon'}
        
        model = self.load_model(symbol, horizon)
        if not model:
            return {
                'status': 'error', 
                'message': f'Model not trained for {symbol} ({horizon}). Use /train endpoint first.'
            }
        
        # Get recent data
        df = DataAcquisition.fetch_stock_data(symbol, period='6mo')
        if df.empty:
            return {'status': 'error', 'message': 'No data available'}
        
        df = DataAcquisition.add_technical_indicators(df)
        current_price = DataAcquisition.get_current_price(symbol) or df['Close'].iloc[-1]
        
        # Prepare features
        feature_columns = ['Open', 'High', 'Low', 'Close', 'Volume', 'RSI', 'MACD', 
                          'MACD_Signal', 'BB_Upper', 'BB_Lower', 'EMA_12', 'EMA_26', 
                          'SMA_50', 'ADX']
        available_cols = [col for col in feature_columns if col in df.columns]
        data = df[available_cols].values[-Config.SEQUENCE_LENGTH:]
        
        if len(data) < Config.SEQUENCE_LENGTH:
            return {'status': 'error', 'message': 'Insufficient data for prediction'}
        
        # Scale and predict
        scaled_data = model.scaler.transform(data)
        X_pred = scaled_data.reshape(1, Config.SEQUENCE_LENGTH, len(available_cols))
        prediction_scaled = model.predict(tuple(map(tuple, X_pred)))[0][0]
        
        # Inverse transform
        dummy = np.zeros((1, len(available_cols)))
        dummy[0, available_cols.index('Close')] = prediction_scaled
        predicted_price = model.scaler.inverse_transform(dummy)[0, available_cols.index('Close')]
        
        change_pct = ((predicted_price - current_price) / current_price) * 100
        latest = df.iloc[-1]
        rsi = latest.get('RSI', 50)
        
        # Simple recommendation logic
        signals = sum([
            change_pct > 2,
            rsi < 30,
            current_price > latest.get('EMA_26', current_price)
        ])
        
        recommendation = 'BUY' if signals >= 2 else ('SELL' if signals == 0 else 'HOLD')
        
        # Confidence from metadata
        metadata = self.db.get_model_metadata(symbol, horizon)
        confidence = 'Medium'
        if metadata and 'val_rmse' in metadata:
            val_rmse = metadata['val_rmse']
            if val_rmse < 0.03: confidence = 'High'
            elif val_rmse > 0.08: confidence = 'Low'
        
        return {
            'status': 'success',
            'symbol': symbol,
            'horizon': horizon,
            'current_price': float(current_price),
            'predicted_price': float(predicted_price),
            'change_percent': float(change_pct),
            'recommendation': recommendation,
            'confidence': confidence,
            'sentiment_score': float((rsi - 50) / 50),
            'indicators': {
                'rsi': float(rsi),
                'macd': float(latest.get('MACD', 0)),
                'ema_26': float(latest.get('EMA_26', 0))
            },
            'timestamp': datetime.now().isoformat()
        }

# ==================== TRAINING SYSTEM ====================
class ModelTrainer:
    def __init__(self, db: StockDatabase):
        self.db = db
    
    def train_stock(self, symbol: str) -> Dict:
        """Train models for all horizons (async-friendly)"""
        try:
            df = DataAcquisition.fetch_stock_data(symbol, period='2y')
            if df.empty or len(df) < 200:
                return {'status': 'failed', 'reason': 'insufficient_data'}
            
            df = DataAcquisition.add_technical_indicators(df)
            results = {}
            
            for horizon, steps in [('daily', Config.DAILY_STEPS), 
                                 ('weekly', Config.WEEKLY_STEPS),
                                 ('monthly', Config.MONTHLY_STEPS)]:
                
                try:
                    # Simplified feature prep
                    feature_cols = ['Open', 'High', 'Low', 'Close', 'Volume', 'RSI', 
                                  'MACD', 'EMA_12', 'EMA_26', 'SMA_50']
                    available = [col for col in feature_cols if col in df.columns]
                    data = df[available].values
                    
                    scaler = MinMaxScaler()
                    scaled = scaler.fit_transform(data)
                    
                    X, y = [], []
                    close_idx = available.index('Close')
                    
                    for i in range(Config.SEQUENCE_LENGTH, len(scaled) - steps):
                        X.append(scaled[i-Config.SEQUENCE_LENGTH:i])
                        y.append(scaled[i + steps - 1, close_idx])
                    
                    if len(X) < 50:
                        results[horizon] = {'status': 'failed', 'reason': 'too_few_samples'}
                        continue
                    
                    X, y = np.array(X), np.array(y)
                    split = int(len(X) * 0.8)
                    
                    model = PredictionModel(len(available))
                    model.model = model.build_model()
                    
                    history = model.model.fit(
                        X[:split], y[:split],
                        validation_data=(X[split:], y[split:]),
                        epochs=Config.EPOCHS,
                        batch_size=Config.BATCH_SIZE,
                        verbose=0,
                        callbacks=[EarlyStopping(patience=10)]
                    )
                    
                    # Save
                    model_path = Config.MODELS_DIR / f"{symbol}_{horizon}.keras"
                    scaler_path = Config.MODELS_DIR / f"{symbol}_{horizon}_scaler.pkl"
                    
                    model.model.save(str(model_path))
                    joblib.dump(scaler, str(scaler_path))
                    
                    val_pred = model.model.predict(X[split:], verbose=0)
                    val_rmse = float(np.sqrt(mean_squared_error(y[split:], val_pred)))
                    
                    metrics = {
                        'val_rmse': val_rmse,
                        'epochs': len(history.history['loss'])
                    }
                    
                    self.db.save_model_metadata(symbol, horizon, metrics)
                    results[horizon] = {'status': 'success', **metrics}
                    
                except Exception as e:
                    results[horizon] = {'status': 'failed', 'error': str(e)}
            
            return {'status': 'success', 'horizons': results}
            
        except Exception as e:
            return {'status': 'failed', 'error': str(e)}

# ==================== FASTAPI APP ====================
app = FastAPI(
    title="🚀 AI Stock Prediction API",
    description="Production AI predictions for Indian stocks",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize
Config.setup()
db = StockDatabase()
trainer = ModelTrainer(db)
predictor = PredictionEngine(db)

# ==================== API ENDPOINTS ====================
@app.get("/")
async def root():
    return {
        "message": "🚀 AI Stock Prediction API Live!",
        "version": "2.1.0",
        "status": "healthy",
        "popular_stocks": Config.POPULAR_STOCKS[:10]
    }

@app.get("/predict")
async def predict(symbol: str = Query(..., example="TCS.NS"), horizon: str = Query("daily")):
    """Get AI prediction"""
    result = predictor.predict(symbol, horizon)
    if result['status'] != 'success':
        raise HTTPException(status_code=400, detail=result['message'])
    return result

@app.get("/train")
async def train(symbol: str = Query(..., example="TCS.NS")):
    """Train models for a stock"""
    result = trainer.train_stock(symbol)
    return {
        "status": result['status'],
        "symbol": symbol,
        "details": result
    }

@app.get("/stocks")
async def get_stocks(sector: Optional[str] = None):
    """Get available stocks"""
    if sector:
        stocks = db.get_stocks_by_sector(sector)
    else:
        stocks = db.get_all_stocks()
    return {"count": len(stocks), "stocks": stocks}

@app.get("/top_stocks")
async def get_top_stocks():
    """Get top performing stocks"""
    results = []
    for symbol in Config.POPULAR_STOCKS[:10]:
        try:
            df = DataAcquisition.fetch_stock_data(symbol, period='5d')
            if len(df) >= 2:
                current = df['Close'].iloc[-1]
                prev = df['Close'].iloc[-2]
                change = ((current - prev) / prev) * 100
                results.append({
                    'symbol': symbol,
                    'price': float(current),
                    'change_pct': float(change)
                })
        except:
            continue
    return {
        "count": len(results),
        "stocks": sorted(results, key=lambda x: x['change_pct'], reverse=True)
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)