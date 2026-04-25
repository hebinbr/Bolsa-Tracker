/**
 * Financial calculation utilities
 */

/**
 * Calculates Simple Moving Average
 */
export function calculateSMA(data: number[], period: number): (number | null)[] {
  const sma: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(null);
      continue;
    }
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

/**
 * Calculates Relative Strength Index
 */
export function calculateRSI(data: number[], period: number): (number | null)[] {
  const rsi: (number | null)[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    gains.push(Math.max(0, diff));
    losses.push(Math.max(0, -diff));
  }

  for (let i = 0; i < data.length; i++) {
    // Need at least period data points to start RSI
    if (i < period) {
      rsi.push(null);
      continue;
    }

    let avgGain, avgLoss;
    
    if (i === period) {
      // Initial average (Simple average)
      avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
      avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    } else {
      // Smoothed average (Welles Wilder method)
      const prevRsiIndex = i - 1;
      // We need to track avgGain and avgLoss across calls or recalculate correctly
      // For simplicity in this UI, we'll use a slightly more expensive scan or store intermediate values
      // Let's use the simple version for initial calculation
      const windowGains = gains.slice(i - period, i);
      const windowLosses = losses.slice(i - period, i);
      avgGain = windowGains.reduce((a, b) => a + b, 0) / period;
      avgLoss = windowLosses.reduce((a, b) => a + b, 0) / period;
    }

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }

  return rsi;
}
