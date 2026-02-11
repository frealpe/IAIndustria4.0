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
        
        // PAD: Si es una agregación (ej: count), no hacemos análisis de voltaje
        if (flatData.length === 1 && !flatData[0].hasOwnProperty('voltaje') && !flatData[0].hasOwnProperty('mean')) {
             const key = Object.keys(flatData[0])[0];
             const val = flatData[0][key];
             return { 
                 output: `📊 **Resultado Agregado:**\n- **${key.toUpperCase()}:** ${val}`,
                 stats: flatData[0]
             };
        }

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
    if (tabla === 'datos' || tabla === 'esp32_log' || (df.columns.includes('mean') && df.columns.includes('resultado'))) {
        let output = "";
        
        // 1. Estadísticas Básicas de Voltaje (mean)
        let voltage;
        if (df.columns.includes('mean')) {
             voltage = df['mean'].asType("float32");
        } else if (df.columns.includes('voltaje')) {
             voltage = df['voltaje'].asType("float32");
        } else if (df.columns.includes('loss')) {
             // Fallback para datos de entrenamiento/inferencia
             voltage = df['loss'].asType("float32"); 
             output += "**Nota:** Analizando 'loss' como proxy de magnitud principal.\n";
        } else {
             output += "⚠️ No se encontraron columnas estándar (mean, voltaje) para análisis estadístico básico.\n\n";
             // Intentamos retornar estadística básica de lo que haya numérico
             const numerics = df.selectDtypes(['float32', 'int32']);
             if (numerics.columns.length > 0) {
                 const bestCol = numerics.columns[0];
                 voltage = df[bestCol];
                 output += `Analizando columna detectada: ${bestCol}\n`;
             }
        }

        if (voltage) {
            output += "### 📊 Análisis de Estabilidad (Danfo.js)\n\n";
            output += `**Estadísticas Generales:**\n` + 
                      `- Promedio: ${voltage.mean().toFixed(4)}\n` +
                      `- Desviación Estándar: ${voltage.std().toFixed(4)}\n` +
                      `- Mínimo: ${voltage.min().toFixed(4)}\n` +
                      `- Máximo: ${voltage.max().toFixed(4)}\n\n`;
        }

        // 2. Análisis de Anomalías
        // Extraemos 'isAnomaly' del objeto resultado si es posible, o asumimos que viene aplanado
        let isAnomalySeries;
        if (df.columns.includes('isAnomaly')) {
            isAnomalySeries = df['isAnomaly'];
        } else if (df.columns.includes('resultado')) {
             // Intento de extracción si no se aplanó antes (aunque McpService lo aplana)
             // Asumimos que McpService ya aplanó y 'isAnomaly' existe si el JSON tenía esa clave
             // Si no, lo intentamos sacar de 'mean' si no hay otra opción, pero mejor fallar soft.
        }

        let anomalyRate = 0;
        let anomalyCount = 0;
        let totalCount = df.shape[0];
        let normalMean = 0;
        let anomalyMean = 0;

        if (isAnomalySeries) {
            const anomalyValues = isAnomalySeries.values;
            anomalyCount = anomalyValues.filter(v => v === true || v === "true").length;
            anomalyRate = (anomalyCount / totalCount) * 100;
            
            // Medias por grupo
            // Filtrado manual robusto
            let normalMean = 0;
            let anomalyMean = 0;
            
            if (voltage) {
                const voltageValues = voltage.values;
                const normalVoltages = voltageValues.filter((v, i) => anomalyValues[i] !== true && anomalyValues[i] !== "true");
                const anomalyVoltages = voltageValues.filter((v, i) => anomalyValues[i] === true || anomalyValues[i] === "true");
                
                normalMean = normalVoltages.length > 0 ? normalVoltages.reduce((a, b) => a + b, 0) / normalVoltages.length : 0;
                anomalyMean = anomalyVoltages.length > 0 ? anomalyVoltages.reduce((a, b) => a + b, 0) / anomalyVoltages.length : 0;
            }

            output += `### 🚨 Análisis de Anomalías\n`;
            output += `- **Total Muestras:** ${totalCount}\n`;
            output += `- **Anomalías Detectadas:** ${anomalyCount} (${anomalyRate.toFixed(2)}%)\n`;
            if (voltage) {
                output += `- **Valor Promedio (Normal):** ${normalMean.toFixed(4)}\n`;
                output += `- **Valor Promedio (Anomalía):** ${anomalyMean.toFixed(4)}\n\n`;
            }
        }

        // 3. Tendencia (Últimos 20 vs Global)
        let currentTrend = 0;
        let globalMean = 0;

        if (voltage) {
            const last20 = voltage.tail(20);
            currentTrend = last20.mean();
            globalMean = voltage.mean();
            const trendDirection = currentTrend > globalMean ? "📈 Tendencia Alcista" : "📉 Tendencia Bajista";

            output += `### 📉 Análisis de Tendencia\n`;
            output += `- **Media Global:** ${globalMean.toFixed(4)}\n`;
            output += `- **Media Reciente (últimos 20):** ${currentTrend.toFixed(4)}\n`;
            output += `- **Dirección:** ${trendDirection} (vs Promedio)\n\n`;
        }

        // 4. Insights Estratégicos
        output += `### 🧠 Insights Estratégicos\n`;
        if (anomalyRate > 10) {
            output += "- ⚠️ **ALERTA CRÍTICA:** La tasa de anomalías es muy alta (>10%). Se recomienda revisión inmediata de sensores.\n";
        } else if (anomalyRate > 0) {
            output += "- ⚠️ **ATENCIÓN:** Presencia de anomalías esporádicas. Monitorear patrones de ruido.\n";
        } else {
            output += "- ✅ **ESTABLE:** Operación dentro de parámetros normales.\n";
        }

        if (voltage && voltage.std() > 0.5) {
             output += "- ⚡ **Volatilidad:** Alta variabilidad detectada. Posible ruido eléctrico o fuente inestable.\n";
        } else if (voltage) {
             output += "- ⚡ **Estabilidad:** El valor se mantiene estable.\n";
        }

        return { 
            output, 
            stats: { 
                mean: globalMean, 
                stdev: voltage ? voltage.std() : 0,
                anomalyRate: anomalyRate,
                lastTrend: currentTrend
            } 
        };
    }

    // Default legacy logic for generic 'voltaje' column
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
        // Intentar describir todo
        try {
            const desc = df.describe();
            // Convert to string safely
            // output += JSON.stringify(dfd.toJSON(desc), null, 2); 
            // Describe devuelve un DF, toJSON lo hace objeto.
        } catch (e) {
            output += "No se pudo generar descripción automática.";
        }
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

/**
 * Ejecuta código dinámico usando Danfo.js
 * @param {Array<Object>} data - Datos crudos (ya aplanados si es necesario)
 * @param {string} codigo - Código JS a ejecutar
 * @returns {Object} - Resultado de la ejecución
 */
function executeDanfoCode(data, codigo) {
    try {
        const df = new dfd.DataFrame(data);
        
        // Envolvemos en una función segura
        // params: df, dfd
        const dynamicFunction = new Function('df', 'dfd', codigo);
        
        let executionResult;
        executionResult = dynamicFunction(df, dfd);
        
        const responseText = typeof executionResult === 'object' 
            ? JSON.stringify(executionResult, null, 2) 
            : String(executionResult);

        return {
            output: `✅ Ejecución Exitosa.\nResultados:\n${responseText}`,
            stats: executionResult // Devolvemos el objeto raw por si se necesita
        };
    } catch (error) {
        throw new Error(`Error ejecutando código Danfo: ${error.message}`);
    }
}

module.exports = {
    analyzeData,
    executeDanfoCode
};
