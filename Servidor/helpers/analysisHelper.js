const dfd = require("danfojs-node");

/**
 * Realiza el análisis estadístico usando Danfo.js.
 * @param {Array<Object>} flatData - Array de objetos con los datos a analizar.
 * @param {string} tabla - Nombre de la tabla ('caracterizacion', 'comparacion', etc.)
 * @returns {string} - Texto formateado con el resultado del análisis.
 */
function analyzeData(flatData, tabla) {
    if (!flatData || flatData.length === 0) {
        return "No hay datos válidos para analizar.";
    }

    try {
        const df = new dfd.DataFrame(flatData);
        let analysisOutput = "";

        // Lógica según tabla
        let result = { output: "", stats: {} };
        if (tabla === 'comparacion') {
            result = analyzeComparison(df);
        } else {
            result = analyzeGeneral(df, tabla);
        }

        return result; // Returns { output: string, stats: { mean: number, ... } }
    } catch (error) {
        console.error("Error en helper de análisis:", error);
        throw new Error(`Error procesando datos con Danfo.js: ${error.message}`);
    }
}

/**
 * Análisis específico para la tabla 'comparacion' (voltaje0 vs voltaje1).
 */
function analyzeComparison(df) {
    let output = "";

    if (df.columns.includes('voltaje0') && df.columns.includes('voltaje1')) {
        const v0 = df['voltaje0'];
        const v1 = df['voltaje1'];

        const desc0 = v0.describe();
        const desc1 = v1.describe();

        const json0 = dfd.toJSON(desc0);
        const json1 = dfd.toJSON(desc1);

        output += "### Análisis Comparativo (Planta Real vs Identificación)\n\n";
        output += "**Voltaje 0 (Planta Real):**\n" + JSON.stringify(json0, null, 2) + "\n\n";
        output += "**Voltaje 1 (Identificación):**\n" + JSON.stringify(json1, null, 2) + "\n\n";

        const mean0 = v0.mean();
        const mean1 = v1.mean();
        const diffMedia = Math.abs(mean0 - mean1);

        output += `**Comparación Directa:**\n`;
        output += `- Diferencia de Medias: ${diffMedia.toFixed(4)}\n`;

        // stats object
        const stats = {
            mean: mean0, // Defaulting to voltage0 (Planta Real) as primary mean
            stdev: v0.std(),
            mean1: mean1,
            stdev1: v1.std()
        };

        // Detección de outliers
        output += `\n**Detección de Anomalías (Z-Score > 3):**\n`;
        output += `- Voltaje 0: ${detectOutliers(v0)}\n`;
        output += `- Voltaje 1: ${detectOutliers(v1)}\n`;

    } else {
        output += "La tabla comparación no contiene las columnas esperadas 'voltaje0' y 'voltaje1'. Se muestra resumen general.\n";
        const desc = df.describe();
        output += JSON.stringify(dfd.toJSON(desc), null, 2);
    }

    return { output, stats: df.columns.includes('voltaje0') ? { 
        mean: df['voltaje0'].mean(), 
        stdev: df['voltaje0'].std() 
    } : {} };
}

/**
 * Análisis general para otras tablas (prioriza 'voltaje').
 */
function analyzeGeneral(df, tabla) {
    let output = "";

    if (df.columns.includes('voltaje')) {
        const v = df['voltaje'];
        const desc = v.describe();
        output += `### Análisis de Voltaje (${tabla})\n`;
        output += JSON.stringify(dfd.toJSON(desc), null, 2) + "\n\n";
        
        // Detección de outliers
        output += `**Detección de Anomalías (Z-Score > 3):**\n`;
        output += `${detectOutliers(v)}\n`;

        return { 
            output, 
            stats: { 
                mean: v.mean(), 
                stdev: v.std() 
            } 
        };
    } else {
        output += `### Análisis General (${tabla}) - Columna 'voltaje' no encontrada\n`;
        const desc = df.describe();
        output += JSON.stringify(dfd.toJSON(desc), null, 2);
    }

    return { output, stats: {} };
}

/**
 * Detecta outliers usando Z-Score (desviación > 3).
 * @param {Object} series - Serie de Danfo.js
 * @returns {string} - Resumen de outliers detectados.
 */
function detectOutliers(series) {
    const mean = series.mean();
    const std = series.std();
    
    // Si la desviación es 0 (datos planos), no hay outliers
    if (std === 0) return "Sin anomalías (Desviación Estándar = 0).";

    const threshold = 3;
    const lowerBound = mean - (threshold * std);
    const upperBound = mean + (threshold * std);

    // Filtramos los valores fuera de rango
    // Nota: Danfo JS node tiene filtrado limitado, iteramos array de valores para seguridad
    const values = series.values;
    let outlierCount = 0;
    let outliers = [];

    values.forEach(val => {
        if (val < lowerBound || val > upperBound) {
            outlierCount++;
            if (outliers.length < 5) outliers.push(val); // Guardamos solo los primeros 5 para muestra
        }
    });

    if (outlierCount === 0) {
        return "✅ Ningún dato atípico detectado.";
    } else {
        return `⚠️ **${outlierCount} datos atípicos detectados** (Fuera de rango ${lowerBound.toFixed(2)} - ${upperBound.toFixed(2)}). Ejemplos: [${outliers.join(', ')}...]`;
    }
}

module.exports = {
    analyzeData
};
