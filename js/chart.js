class ChartManager {
    constructor() {
        this.charts = {};
    }

    createPriceChart(containerId, data, prediction) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Sample candlestick data (replace with real API data)
        const options = {
            series: [{
                name: 'Price',
                data: data || this.generateSampleData()
            }],
            chart: {
                type: 'candlestick',
                height: 500,
                toolbar: { show: true },
                zoom: { enabled: true }
            },
            title: {
                text: 'AI Stock Price Prediction',
                align: 'left',
                style: { color: '#e2e8f0', fontSize: '18px' }
            },
            xaxis: {
                type: 'datetime',
                labels: { style: { colors: '#e2e8f0' } }
            },
            yaxis: [{
                labels: { style: { colors: '#e2e8f0' } }
            }],
            grid: {
                borderColor: 'rgba(255,255,255,0.1)',
                strokeDashArray: 3
            },
            theme: {
                mode: 'dark'
            },
            stroke: { width: 1 },
            plotOptions: {
                candlestick: {
                    colors: { upward: '#10b981', downward: '#ef4444' }
                }
            },
            annotations: {
                yaxis: [{
                    y: prediction?.predicted_price || 0,
                    borderColor: '#10b981',
                    label: {
                        text: `AI Prediction: ₹${prediction?.predicted_price?.toFixed(2)}`,
                        style: { color: '#fff', background: '#10b981' }
                    }
                }]
            }
        };

        const chart = new ApexCharts(container, options);
        chart.render();
        this.charts[containerId] = chart;
    }

    generateSampleData() {
        const data = [];
        const dates = [];
        let price = 2500;
        
        for (let i = 0; i < 60; i++) {
            const date = new Date(Date.now() - (60 - i) * 24 * 60 * 60 * 1000);
            dates.push(date);
            
            const change = (Math.random() - 0.5) * 50;
            price += change;
            
            data.push({
                x: date,
                y: [price - 10, price + 10, price - 20, price]
            });
        }
        
        return data;
    }

    updateChart(containerId, prediction) {
        if (this.charts[containerId]) {
            this.charts[containerId].updateOptions({
                annotations: {
                    yaxis: [{
                        y: prediction.predicted_price,
                        borderColor: prediction.change_percent > 0 ? '#10b981' : '#ef4444',
                        label: {
                            text: `AI Prediction: ₹${prediction.predicted_price.toFixed(2)}`,
                            style: { 
                                color: '#fff', 
                                background: prediction.change_percent > 0 ? '#10b981' : '#ef4444' 
                            }
                        }
                    }]
                }
            });
        }
    }

    destroy(containerId) {
        if (this.charts[containerId]) {
            this.charts[containerId].destroy();
            delete this.charts[containerId];
        }
    }
}

const chartManager = new ChartManager();