const multi = require('../services/MultiAgentService');

async function run() {
  const prompt = `Analiza la serie de loss para la Planta 1. Calcula la media móvil de 10 muestras, detecta la tendencia de crecimiento (pendiente por regresión lineal sobre las últimas 200 muestras) y compara la volatilidad de los últimos 50 registros frente a los 50 previos. Devuelve un resumen en texto (analysis_text) y en execution.stats un objeto con total_samples, ma10_last5, slope, slope_interpretation, volatility { std_last_n, std_prev_n, ratio }, outliers { count, examples }. Usa las utilidades disponibles y, si generas código Danfo, asegúrate de acceder a columnas con df['loss'].`; 

  try {
    const res = await multi.processQuery(prompt);
    console.log('Agent response:', JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('Agent run error:', e.message);
  }
}

run();
