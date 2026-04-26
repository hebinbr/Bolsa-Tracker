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
 * Calculates Exponential Moving Average
 */
export function calculateEMA(data: number[], period: number): (number | null)[] {
  const ema: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prevEma: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(null);
      continue;
    }

    if (prevEma === null) {
      // First EMA is simple SMA
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      prevEma = sum / period;
    } else {
      prevEma = (data[i] - prevEma) * k + prevEma;
    }
    ema.push(prevEma);
  }
  return ema;
}

/**
 * Calculates Standard Deviation for Bollinger Bands
 */
function calculateStdDev(data: number[], mean: number): number {
  const squareDiffs = data.map(value => {
    const diff = value - mean;
    return diff * diff;
  });
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / data.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Calculates Bollinger Bands
 */
export function calculateBollingerBands(data: number[], period: number, stdDevMult: number = 2) {
  const middle: (number | null)[] = [];
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      middle.push(null);
      upper.push(null);
      lower.push(null);
      continue;
    }

    const window = data.slice(i - period + 1, i + 1);
    const sum = window.reduce((a, b) => a + b, 0);
    const avg = sum / period;
    const stdDev = calculateStdDev(window, avg);

    middle.push(avg);
    upper.push(avg + stdDevMult * stdDev);
    lower.push(avg - stdDevMult * stdDev);
  }

  return { middle, upper, lower };
}

/**
 * Calculates MACD
 */
export function calculateMACD(data: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  const macdLine: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    const f = fastEMA[i];
    const s = slowEMA[i];
    if (f !== null && s !== null) {
      macdLine.push(f - s);
    } else {
      macdLine.push(null);
    }
  }

  // Signal line is EMA of MACD line
  const macdValuesForSignal = macdLine.filter(v => v !== null) as number[];
  const signalEMA = calculateEMA(macdValuesForSignal, signalPeriod);
  
  const signalLine: (number | null)[] = [];
  const histogram: (number | null)[] = [];
  
  let signalIdx = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== null) {
      const sig = signalEMA[signalIdx];
      signalLine.push(sig);
      if (sig !== null && macdLine[i] !== null) {
        histogram.push(macdLine[i]! - sig);
      } else {
        histogram.push(null);
      }
      signalIdx++;
    } else {
      signalLine.push(null);
      histogram.push(null);
    }
  }

  return { macdLine, signalLine, histogram };
}

/**
 * Calculates Stochastic Oscillator
 */
export function calculateStochastic(highs: number[], lows: number[], closes: number[], kPeriod: number = 14, dPeriod: number = 3) {
  const percentK: (number | null)[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) {
      percentK.push(null);
      continue;
    }

    const windowHighs = highs.slice(i - kPeriod + 1, i + 1);
    const windowLows = lows.slice(i - kPeriod + 1, i + 1);
    
    const highestHigh = Math.max(...windowHighs);
    const lowestLow = Math.min(...windowLows);
    
    if (highestHigh === lowestLow) {
      percentK.push(100);
    } else {
      percentK.push(((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100);
    }
  }

  // %D is 3-day SMA of %K
  const kValuesForD = percentK.map(v => v === null ? 0 : v); // Temporary to use SMA function
  const percentD = calculateSMA(kValuesForD, dPeriod);
  
  // Re-apply nulls for %D where %K was null
  for (let i = 0; i < percentD.length; i++) {
    if (percentK[i] === null) {
      percentD[i] = null;
    }
  }

  return { percentK, percentD };
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
    if (i < period) {
      rsi.push(null);
      continue;
    }

    let avgGain, avgLoss;
    const windowGains = gains.slice(i - period, i);
    const windowLosses = losses.slice(i - period, i);
    avgGain = windowGains.reduce((a, b) => a + b, 0) / period;
    avgLoss = windowLosses.reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }

  return rsi;
}
