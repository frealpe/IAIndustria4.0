const fs = require('fs');
const path = require('path');
const { dbConnection } = require('../database/config');

function mean(arr) {
  const f = arr.filter(v => Number.isFinite(v));
  if (f.length === 0) return 0;
  return f.reduce((a, b) => a + b, 0) / f.length;
}

function std(arr) {
  const f = arr.filter(v => Number.isFinite(v));
  if (f.length === 0) return 0;
  const m = mean(f);
  const variance = f.reduce((s, v) => s + Math.pow(v - m, 2), 0) / f.length;
  return Math.sqrt(variance);
}

function movingAverage(arr, window) {
  const res = [];
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = Number(arr[i]) || 0;
    sum += v;
    if (i >= window) sum -= Number(arr[i - window]) || 0;
    if (i >= window - 1) res.push(sum / window);
  }
  return res;
}

function zScores(arr) {
  const f = arr.map(v => Number(v));
  const m = mean(f);
  const s = std(f) || 0;
  if (s === 0) return f.map(() => 0);
  return f.map(v => (v - m) / s);
}

function iqrOutliers(arr, k = 1.5) {
  const f = arr.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  if (f.length < 4) return [];
  const q1 = f[Math.floor((f.length - 1) * 0.25)];
  const q3 = f[Math.floor((f.length - 1) * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - k * iqr;
  const upper = q3 + k * iqr;
  return arr.map(v => (v < lower || v > upper));
}

function topKIndicesByAbsDiff(arr, k = 10) {
  // return indices of top-k largest absolute deviation from median
  const median = arr.slice().filter(v => Number.isFinite(v)).sort((a, b) => a - b)[Math.floor(arr.length / 2)] || 0;
  return arr
    .map((v, i) => ({ i, d: Math.abs((Number(v) || 0) - median) }))
    .sort((a, b) => b.d - a.d)
    .slice(0, k)
    .map(x => x.i);
}

async function main() {
  const pool = await dbConnection();
  try {
    const query = `
      SELECT d.created_at, (d.resultado->>'loss')::float as loss, d.resultado
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

    // Extract loss numeric values and keep timestamps
    const entries = rows.map(r => ({ ts: r.created_at, loss: (r.loss === null || r.loss === undefined) ? null : Number(r.loss), raw: r.resultado }));
    const losses = entries.map(e => e.loss === null ? NaN : e.loss);

    // Basic stats
    const total = losses.filter(v => Number.isFinite(v)).length;
    const mw = movingAverage(losses, 10);

    // Z-scores and z-based anomalies (threshold 3)
    const zs = zScores(losses);
    const zAnomMask = zs.map(z => Math.abs(z) >= 3);

    // IQR-based anomalies
    const iqrMask = iqrOutliers(losses, 1.5);

    // Rolling z-score (window 50)
    const rollWindow = 50;
    const rollZMask = [];
    for (let i = 0; i < losses.length; i++) {
      const start = Math.max(0, i - rollWindow + 1);
      const slice = losses.slice(start, i + 1).filter(v => Number.isFinite(v));
      if (slice.length < Math.min(10, rollWindow)) { rollZMask.push(false); continue; }
      const mz = mean(slice), sz = std(slice) || 0;
      if (sz === 0) { rollZMask.push(false); continue; }
      const z = ((Number(losses[i]) || 0) - mz) / sz;
      rollZMask.push(Math.abs(z) >= 3);
    }

    // Combine masks to flag anomalies
    const anomalies = entries.map((e, idx) => {
      const isZ = !!zAnomMask[idx];
      const isIqr = !!iqrMask[idx];
      const isRoll = !!rollZMask[idx];
      const score = (isZ ? 1 : 0) + (isIqr ? 1 : 0) + (isRoll ? 1 : 0);
      return Object.assign({}, e, { index: idx, z: zs[idx] || 0, isZ, isIqr, isRoll, score });
    }).filter(a => a.loss !== null && a.loss !== undefined && Number.isFinite(a.loss));

    // Pick top anomalies by absolute deviation
    const topIdx = topKIndicesByAbsDiff(anomalies.map(a => a.loss), Math.min(20, Math.max(5, Math.floor(anomalies.length * 0.02))));
    const topAnoms = topIdx.map(i => anomalies[i]).filter(Boolean);

    const summary = {
      total_samples: total,
      moving_average_window: 10,
      last_moving_average: mw.slice(-5),
      anomalies_count_z: zAnomMask.filter(Boolean).length,
      anomalies_count_iqr: iqrMask.filter(Boolean).length,
      anomalies_count_rolling_z: rollZMask.filter(Boolean).length,
      top_anomalies: topAnoms.map(a => ({ ts: a.ts, loss: a.loss, score: a.score, z: a.z }))
    };

    // Write CSV of anomalies (combined mask)
    const combinedMask = entries.map((e, idx) => {
      const keep = (zAnomMask[idx] || iqrMask[idx] || rollZMask[idx]);
      return { ts: e.ts, loss: e.loss, is_anomaly: !!keep, z: zs[idx] || 0, isZ: !!zAnomMask[idx], isIqr: !!iqrMask[idx], isRoll: !!rollZMask[idx] };
    });

    const outDir = path.join(__dirname, '..', 'outputs');
    try { fs.mkdirSync(outDir, { recursive: true }); } catch (e) {}
    const csvPath = path.join(outDir, `anomalies_planta1_${Date.now()}.csv`);
    const csvHeader = 'timestamp,loss,is_anomaly,z,isZ,isIqr,isRoll\n';
    const csvBody = combinedMask.map(r => `${r.ts.toISOString()},${Number.isFinite(r.loss) ? r.loss : ''},${r.is_anomaly},${r.z},${r.isZ},${r.isIqr},${r.isRoll}`).join('\n');
    fs.writeFileSync(csvPath, csvHeader + csvBody);

    console.log('Resumen:');
    console.log(JSON.stringify(summary, null, 2));
    console.log('CSV de anomalías escrito en:', csvPath);

  } catch (err) {
    console.error('Error ejecutando análisis de anomalías:', err.message);
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
