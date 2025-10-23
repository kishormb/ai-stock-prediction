import { CHART_COLORS } from './constants';

/**
 * Default chart configuration for Recharts
 */
export const defaultChartConfig = {
  margin: { top: 10, right: 30, left: 0, bottom: 0 },
  height: 400,
};

/**
 * Candlestick chart configuration
 */
export const candlestickConfig = {
  ...defaultChartConfig,
  height: 500,
  colors: {
    bullish: CHART_COLORS.success,
    bearish: CHART_COLORS.danger,
    line: CHART_COLORS.primary,
    prediction: CHART_COLORS.secondary,
  },
};

/**
 * Volume chart configuration
 */
export const volumeConfig = {
  ...defaultChartConfig,
  height: 150,
};

/**
 * Indicator chart configuration
 */
export const indicatorConfig = {
  ...defaultChartConfig,
  height: 200,
};

/**
 * Tooltip configuration
 */
export const tooltipConfig = {
  contentStyle: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    borderRadius: '8px',
    padding: '12px',
  },
  labelStyle: {
    color: '#e2e8f0',
    fontWeight: 600,
    marginBottom: '8px',
  },
  itemStyle: {
    color: '#94a3b8',
    fontSize: '12px',
  },
};

/**
 * Legend configuration
 */
export const legendConfig = {
  wrapperStyle: {
    fontSize: '12px',
    fontFamily: 'Inter',
    paddingTop: '10px',
  },
  iconType: 'circle',
};

/**
 * Grid configuration
 */
export const gridConfig = {
  strokeDasharray: '3 3',
  stroke: '#334155',
  opacity: 0.3,
};

/**
 * Axis configuration
 */
export const axisConfig = {
  stroke: '#94a3b8',
  style: {
    fontSize: '12px',
    fontFamily: 'Inter',
  },
};
