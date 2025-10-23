import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import LivePredictions from './components/Dashboard/LivePredictions';
import StockAnalysis from './components/Dashboard/StockAnalysis';
import MarketMovers from './components/Dashboard/MarketMovers';
import ModelTraining from './components/Dashboard/ModelTraining';
import { useTheme } from './hooks/useTheme';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <Router>
      <div className={`${darkMode ? 'dark' : ''} min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          
          <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            <Header 
              sidebarOpen={sidebarOpen} 
              setSidebarOpen={setSidebarOpen}
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
            />
            
            <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
              <Routes>
                <Route path="/" element={<LivePredictions />} />
                <Route path="/analysis" element={<StockAnalysis />} />
                <Route path="/movers" element={<MarketMovers />} />
                <Route path="/training" element={<ModelTraining />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
