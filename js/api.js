// API Configuration
const API_BASE_URL = 'https://ai-stock-prediction-84jx.onrender.com'; // Replace with your Render URL

class APIClient {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Failed:', error);
            throw error;
        }
    }

    // Get all stocks
    async getStocks() {
        return this.request('/stocks');
    }

    // Get prediction
    async getPrediction(symbol, horizon = 'daily') {
        return this.request(`/predict?symbol=${symbol}&horizon=${horizon}`);
    }

    // Train model
    async trainModel(symbol) {
        return this.request(`/train?symbol=${symbol}`);
    }

    // Batch prediction
    async batchPredict(symbols, horizon = 'daily') {
        const symbolString = symbols.join(',');
        return this.request(`/batch_predict?symbols=${symbolString}&horizon=${horizon}`);
    }

    // Top movers
    async getTopStocks(sector = null) {
        const params = sector ? `?sector=${sector}` : '';
        return this.request(`/top_stocks${params}`);
    }

    // Sectors
    async getSectors() {
        return this.request('/sectors');
    }

    // News
    async getNews(symbol) {
        return this.request(`/news?symbol=${symbol}`);
    }
}

const api = new APIClient();