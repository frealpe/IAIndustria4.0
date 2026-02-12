const mcp = require('../services/McpService');

async function run() {
  const tools = mcp.getRawTools();
  const tool = tools.find(t => t.name === 'analizar_datos_avanzado');
  if (!tool) {
    console.error('Tool not found');
    process.exit(1);
  }

  const sql = `SELECT d.resultado->>'loss' AS loss, d.created_at FROM datos d JOIN Devices dev ON d.device_uid = dev.device_uid WHERE dev.name ILIKE '%planta%1%' ORDER BY d.created_at DESC LIMIT 200`;

  const codigo = [
    "// Extraer losses numéricos",
    "const losses = df['loss'].values.map(v => Number(v || 0));",
    "const ma10 = helpers.movingAverage(losses, 10);",
    "const ma10_last5 = ma10.slice(-5);",
    "const slope = helpers.linearRegressionSlope(losses.slice(-200));",
    "const slope_interpretation = slope > 0 ? 'Creciente' : (slope < 0 ? 'Decreciente' : 'Plano');",
    "const last50 = losses.slice(-50);",
    "const prev50 = losses.slice(Math.max(0, losses.length - 100), Math.max(0, losses.length - 50));",
    "const vol = helpers.detectVolatilityIncrease(last50, prev50);",
    "const z = helpers.zScoreOutliers(losses, 3);",
    "const outliers = { count: z.outliers.length, examples: z.outliers.slice(0,5).map(o => ({ index: o.index, value: o.value, z: o.z })) };",
    "const mk = helpers.mannKendall(losses.slice(-200));",
    "const summary = { total_samples: losses.length, ma10_last5, slope, slope_interpretation, volatility: vol, outliers, mann_kendall: mk };",
    "const analysis_text = `Se analizaron ${losses.length} muestras. Pendiente: ${slope_interpretation} (slope=${slope.toFixed(6)}). Volatilidad ratio: ${isFinite(vol.ratio) ? vol.ratio.toFixed(4) : String(vol.ratio)}. Outliers detectados: ${outliers.count}.`;",
    "return { summary, analysis_text };"
  ].join('\n');

  try {
    const res = await tool.func({ tabla: 'datos', sql, codigo });
    console.log('Tool response:', JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('Tool error:', e.message);
  } finally {
    process.exit(0);
  }
}

run();
