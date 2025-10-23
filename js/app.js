class App {
    constructor() {
        this.currentSymbol = null;
        this.currentHorizon = 'daily';
        this.init();
    }

    async init() {
        this.showLoading();
        await this.loadStocks();
        this.setupEventListeners();
        this.hideLoading();
        this.switchPage('predictions');
    }

    showLoading() {
        document.getElementById('loading-screen').style.display = 'flex';
    }

    hideLoading() {
        setTimeout(() => {
            document.getElementById('loading-screen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
            }, 500);
        }, 1000);
    }

    async loadStocks() {
        try {
            const response = await api.getStocks();
            const select = document.getElementById('stock-select');
            select.innerHTML = '';
            
            response.stocks.forEach(stock => {
                const option = document.createElement('option');
                option.value = stock.symbol;
                option.textContent = `${stock.symbol.replace('.NS', '')} (${stock.sector})`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load stocks:', error);
            document.getElementById('stock-select').innerHTML = '<option>Failed to load stocks</option>';
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page;
                this.switchPage(page);
            });
        });

        // Prediction button
        document.getElementById('predict-btn').addEventListener('click', () => {
            this.getPrediction();
        });

        // Stock select
        document.getElementById('stock-select').addEventListener('change', (e) => {
            this.currentSymbol = e.target.value;
        });

        // Horizon select
        document.getElementById('horizon-select').addEventListener('change', (e) => {
            this.currentHorizon = e.target.value;
        });

        // Train button
        document.getElementById('train-btn').addEventListener('click', () => {
            this.trainModel();
        });

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.getPrediction();
        });
    }

    async getPrediction() {
        if (!this.currentSymbol) {
            this.showAlert('Please select a stock first!', 'warning');
            return;
        }

        const predictBtn = document.getElementById('predict-btn');
        const originalText = predictBtn.innerHTML;
        
        predictBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Analyzing...';
        predictBtn.disabled = true;

        try {
            const response = await api.getPrediction(this.currentSymbol, this.currentHorizon);
            this.displayPrediction(response);
            this.updateLastUpdate();
        } catch (error) {
            this.showAlert('Prediction failed. Please try again or train the model first.', 'danger');
        } finally {
            predictBtn.innerHTML = originalText;
            predictBtn.disabled = false;
        }
    }

    displayPrediction(data) {
        document.getElementById('prediction-results').style.display = 'block';

        // Update recommendation card
        const recCard = document.getElementById('recommendation-card');
        const recIcon = document.getElementById('rec-icon');
        const recText = document.getElementById('rec-text');
        const recBadge = document.getElementById('rec-badge');

        recCard.className = `recommendation-card col-12 ${data.recommendation.toLowerCase()}`;
        
        const icons = {
            'BUY': '<i class="fas fa-rocket"></i> Strong Buy',
            'SELL': '<i class="fas fa-chart-line-down"></i> Strong Sell',
            'HOLD': '<i class="fas fa-pause-circle"></i> Hold'
        };

        recIcon.innerHTML = icons[data.recommendation] || icons['HOLD'];
        recText.textContent = data.recommendation;
        recBadge.innerHTML = `<span class="badge rounded-pill fs-6 px-4 py-2">${data.recommendation}</span>`;

        // Update metrics
        document.getElementById('current-price').textContent = `₹${data.current_price.toFixed(2)}`;
        document.getElementById('predicted-price').textContent = `₹${data.predicted_price.toFixed(2)}`;
        document.getElementById('change-percent').textContent = `${data.change_percent.toFixed(2)}%`;
        document.getElementById('confidence').textContent = data.confidence;
        document.getElementById('sentiment-score').textContent = data.sentiment_score.toFixed(2);

        // Update change percent color
        const changeEl = document.getElementById('change-percent');
        changeEl.className = data.change_percent >= 0 ? 'metric-value text-success' : 'metric-value text-danger';

        // Update chart
        chartManager.updateChart('price-chart', data);

        // Update indicators
        document.getElementById('rsi-value').textContent = data.indicators.rsi.toFixed(1);
        document.getElementById('macd-value').textContent = data.indicators.macd.toFixed(2);

        this.showAlert(`✅ Prediction received for ${this.currentSymbol}!`, 'success');
    }

    async trainModel() {
        if (!this.currentSymbol) {
            this.showAlert('Please select a stock first!', 'warning');
            return;
        }

        if (!confirm(`Train AI model for ${this.currentSymbol}? This takes 5-10 minutes.`)) {
            return;
        }

        const trainBtn = document.getElementById('train-btn');
        const originalText = trainBtn.innerHTML;
        trainBtn.innerHTML = '<i class="fas fa-robot me-2"></i>Training...';
        trainBtn.disabled = true;

        try {
            const response = await api.trainModel(this.currentSymbol);
            this.showAlert('✅ Model training started! Check back in 5-10 minutes.', 'success');
        } catch (error) {
            this.showAlert('Training failed. Please try again.', 'danger');
        } finally {
            trainBtn.innerHTML = originalText;
            trainBtn.disabled = false;
        }
    }

    switchPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });

        // Remove active nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show selected page
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Add active class to clicked link
        event?.target.classList.add('active');

        // Load page content
        this.loadPageContent(pageName);
    }

    async loadPageContent(pageName) {
        switch (pageName) {
            case 'top-movers':
                await this.loadTopMovers();
                break;
            case 'news':
                await this.loadNews();
                break;
        }
    }

    async loadTopMovers() {
        try {
            const response = await api.getTopStocks();
            const container = document.getElementById('top-movers-content');
            container.innerHTML = '';

            // Top Gainers
            const gainers = response.stocks.slice(0, 10).filter(s => s.change_pct > 0);
            const losers = response.stocks.slice(0, 10).filter(s => s.change_pct <= 0).reverse();

            container.innerHTML = `
                <div class="col-lg-6">
                    <div class="glass-card p-4">
                        <h5><i class="fas fa-arrow-up me-2 text-success"></i>Top Gainers</h5>
                        ${gainers.map(stock => `
                            <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                                <span class="fw-bold">${stock.symbol.replace('.NS', '')}</span>
                                <div class="text-end">
                                    <div class="fw-bold text-success">₹${stock.price.toFixed(2)}</div>
                                    <small class="text-success">+${stock.change_pct.toFixed(2)}%</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="glass-card p-4">
                        <h5><i class="fas fa-arrow-down me-2 text-danger"></i>Top Losers</h5>
                        ${losers.map(stock => `
                            <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                                <span class="fw-bold">${stock.symbol.replace('.NS', '')}</span>
                                <div class="text-end">
                                    <div class="fw-bold text-danger">₹${stock.price.toFixed(2)}</div>
                                    <small class="text-danger">${stock.change_pct.toFixed(2)}%</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Failed to load top movers:', error);
        }
    }

    showAlert(message, type = 'info') {
        // Simple toast notification
        const alert = document.createElement('div');
        alert.className = `alert alert-${type === 'success' ? 'success' : type === 'danger' ? 'danger' : 'warning'} alert-dismissible fade show position-fixed`;
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);

        setTimeout(() => {
            alert.remove();
        }, 5000);
    }

    updateLastUpdate() {
        const now = new Date();
        document.getElementById('last-update').textContent = `Last update: ${now.toLocaleTimeString()}`;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();

    // Initialize chart with sample data
    chartManager.createPriceChart('price-chart', null, null);

    // Auto-refresh every 60 seconds
    setInterval(() => {
        if (document.getElementById('prediction-results').style.display === 'block') {
            const app = window.appInstance;
            if (app && app.currentSymbol) {
                app.getPrediction();
            }
        }
    }, 60000);
});

// Make app instance global for auto-refresh
window.appInstance = null;