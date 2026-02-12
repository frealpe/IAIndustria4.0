const mcp = require('../services/McpService');

async function run() {
  const tools = mcp.getRawTools();
  const tool = tools.find(t => t.name === 'analizar_datos_avanzado');
  if (!tool) {
    console.error('Tool not found');
    process.exit(1);
  }

  const sql = `SELECT d.resultado->>'loss' AS loss, d.created_at FROM datos d JOIN Devices dev ON d.device_uid = dev.device_uid WHERE dev.name ILIKE '%planta%1%' ORDER BY d.created_at DESC LIMIT 200`;

  // Simulate agent-generated código that uses df.loss.cast (problematic pattern)
  const codigo = "const s = df.loss.cast('float32'); const arr = s.values.map(v => Number(v || 0)); const ma10 = helpers.movingAverage(arr,10); return { total: arr.length, ma10_last5: ma10.slice(-5) };";

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
