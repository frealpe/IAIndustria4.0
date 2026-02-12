const { dbConnection } = require('../database/config');

function movingAverage(arr, window) {
  const res = [];
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
    if (i >= window) sum -= arr[i - window];
    if (i >= window - 1) res.push(sum / window);
  }
  return res;
}

function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr) {
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / (arr.length || 1);
  return Math.sqrt(variance);
}

function linearRegressionSlope(arr) {
  // x = 0..n-1, y = arr
  const n = arr.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = mean(arr);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const x = i;
    num += (x - xMean) * (arr[i] - yMean);
    den += Math.pow(x - xMean, 2);
  }
  return den === 0 ? 0 : num / den;
}

(async function main(){
  const pool = await dbConnection();
  try {
    const query = `
      SELECT d.created_at, (d.resultado->>'loss')::float as loss
      FROM datos d
      JOIN devices dev ON d.device_uid = dev.device_uid
      WHERE dev.name ILIKE '%planta%1%'
      ORDER BY d.created_at ASC
    `;

    const { rows } = await pool.query(query);
    if (!rows || rows.length === 0) {
      console.log('No se obtuvieron registros para Planta 1.');
      return process.exit(0);
    }

    const losses = rows.map(r => r.loss).filter(v => v !== null && v !== undefined && !Number.isNaN(v));
    console.log(`Registros totales encontrados: ${losses.length}`);

    const window = 10;
    const ma = movingAverage(losses, window);

    // Trend detection: compute slope on last 100 samples if available, otherwise all
    const trendWindow = Math.min(200, losses.length);
    const trendSlice = losses.slice(-trendWindow);
    const slope = linearRegressionSlope(trendSlice);

    // Volatility: compare std of last 50 vs previous 50 or vs overall
    const lastN = 50;
    const lastSlice = losses.slice(-lastN);
    const prevSlice = losses.slice(Math.max(0, losses.length - 2 * lastN), Math.max(0, losses.length - lastN));

    const stdLast = std(lastSlice);
    const stdPrev = prevSlice.length > 0 ? std(prevSlice) : std(losses.slice(0, Math.max(0, losses.length - lastN)));

    const volatilityIncrease = stdPrev === 0 ? (stdLast > 0) : (stdLast / stdPrev);

    // Simple heuristic for trend: slope positive and relative increase in mean
    const meanLast = mean(lastSlice);
    const meanPrev = prevSlice.length > 0 ? mean(prevSlice) : mean(losses.slice(0, Math.max(0, losses.length - lastN)));

    const trendGrowing = slope > 0 && meanLast > meanPrev;

    const summary = {
      total_samples: losses.length,
      moving_average_window: window,
      last_moving_average: ma.slice(-5),
      trend: {
        slope: slope,
        slope_interpretation: slope > 0 ? 'Creciente' : (slope < 0 ? 'Decreciente' : 'Plano'),
        trend_window_used: trendWindow
      },
      volatility: {
        std_last_n: stdLast,
        std_previous_n: stdPrev,
        volatility_ratio: volatilityIncrease
      },
      verdict: {
        trend_growing: trendGrowing,
        volatility_increasing: volatilityIncrease > 1.2 // threshold 20% increase
      }
    };

    console.log(JSON.stringify(summary, null, 2));

  } catch (err) {
    console.error('Error ejecutando el análisis:', err.message);
  } finally {
    await pool.end();
  }
})();
