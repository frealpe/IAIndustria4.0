const dfd = require("danfojs-node");

/* =====================================================
   MAIN ENTRY
===================================================== */

function analyzeData(flatData, tabla) {
    if (!Array.isArray(flatData) || flatData.length === 0) {
        return {
            output: "No hay datos válidos.",
            stats: {}
        };
    }

    try {
        const df = new dfd.DataFrame(flatData);

        // Caso: agregación simple
        if (
            flatData.length === 1 &&
            !("voltaje" in flatData[0]) &&
            !("mean" in flatData[0])
        ) {
            return {
                output: JSON.stringify(flatData, null, 2),
                stats: flatData[0]
            };
        }

        return analyzeGeneral(df, tabla);

    } catch (error) {
        return {
            output: `Error procesando datos: ${error.message}`,
            stats: {}
        };
    }
}

/* =====================================================
   GENERAL ANALYSIS
===================================================== */

function analyzeGeneral(df, tabla) {
    let output = "";
    let voltage = null;

    // Detectar columna principal
    if (df.columns.includes("mean")) {
        voltage = df["mean"].asType("float32");
    } else if (df.columns.includes("voltaje")) {
        voltage = df["voltaje"].asType("float32");
    } else if (df.columns.includes("loss")) {
        voltage = df["loss"].asType("float32");
        output += "Analizando columna 'loss'.\n\n";
    }

    if (!voltage) {
        return {
            output: "No se encontró columna numérica para análisis.",
            stats: {}
        };
    }

    const mean = voltage.mean();
    const std = voltage.std();
    const min = voltage.min();
    const max = voltage.max();

    output += `📊 Estadísticas\n`;
    output += `Promedio: ${mean.toFixed(4)}\n`;
    output += `Desviación: ${std.toFixed(4)}\n`;
    output += `Mínimo: ${min.toFixed(4)}\n`;
    output += `Máximo: ${max.toFixed(4)}\n\n`;

    // ---------- Anomalías ----------
    let anomalyRate = 0;

    if (df.columns.includes("isAnomaly")) {
        const flags = df["isAnomaly"].values;
        const total = flags.length;
        const count = flags.filter(v => v === true).length;

        anomalyRate = (count / total) * 100;

        output += `🚨 Anomalías: ${count} (${anomalyRate.toFixed(2)}%)\n\n`;
    }

    // ---------- Tendencia ----------
    const last20 = voltage.tail(20);
    const trend = last20.mean();

    output += `📈 Tendencia reciente: ${trend.toFixed(4)}\n`;

    return {
        output,
        stats: {
            mean,
            stdev: std,
            anomalyRate,
            lastTrend: trend
        }
    };
}

/* =====================================================
   OUTLIER DETECTOR
===================================================== */

function detectOutliers(series) {
    const mean = series.mean();
    const std = series.std();

    if (std === 0) return "Sin anomalías.";

    const lower = mean - 3 * std;
    const upper = mean + 3 * std;

    const values = series.values;
    const outliers = values.filter(v => v < lower || v > upper);

    return outliers.length
        ? `${outliers.length} outliers detectados`
        : "Sin outliers";
}

/* =====================================================
   SAFE DANFO EXECUTOR (FOR AI AGENTS)
===================================================== */

function executeDanfoCode(data, codigo) {
    try {
        console.log("DEBUG: Checking code for forbidden terms...");
        if (codigo.includes(".plot") || codigo.includes("nodeplotlib")) {
             console.log("DEBUG: Forbidden term detected!");
            throw new Error("Security Error: Plotting inside code is forbidden. Return calculated arrays/objects and build the JSON visualization in the final response.");
        }

        console.log(`[AnalysisHelper] executing code. Input rows: ${data.length}`);
        console.log(`[AnalysisHelper] Code: ${codigo.slice(0, 100)}...`);
        const df = new dfd.DataFrame(data);

        const helpers = {
            mean: arr => arr.reduce((a, b) => a + b, 0) / arr.length,

            std: arr => {
                const m = helpers.mean(arr);
                return Math.sqrt(
                    arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length
                );
            },

            movingAverage: (arr, window) => {
                const res = [];
                for (let i = window - 1; i < arr.length; i++) {
                    res.push(
                        helpers.mean(arr.slice(i - window + 1, i + 1))
                    );
                }
                return res;
            },

            regressionSlope: arr => {
                const n = arr.length;
                const xMean = (n - 1) / 2;
                const yMean = helpers.mean(arr);

                let num = 0, den = 0;

                for (let i = 0; i < n; i++) {
                    num += (i - xMean) * (arr[i] - yMean);
                    den += Math.pow(i - xMean, 2);
                }

                return num / den;
            }
        };

        const sandbox = new Function("df", "helpers", "dfd", codigo);
        const rawResult = sandbox(df, helpers, dfd);

        // Serialization Helper
        const processResult = (res) => {
            if (res === null || res === undefined) return null;
            if (typeof res === 'string' || typeof res === 'number' || typeof res === 'boolean') return res;
            
            // Danfo objects detection (naive check to avoid instanceOf issues across contexts)
            if (res.constructor && res.constructor.name === 'DataFrame') {
                return dfd.toJSON(res); // Default is column format key-value
            }
            if (res.constructor && res.constructor.name === 'Series') {
                return res.values;
            }
            
            if (Array.isArray(res)) return res.map(processResult);
            
            if (typeof res === 'object') {
                const out = {};
                for (const key in res) {
                    // Avoid internal Danfo keys usually starting with $ or _
                    if (key.startsWith('$') || key.startsWith('_')) continue;
                    out[key] = processResult(res[key]);
                }
                return out;
            }
            return String(res);
        };

        const result = processResult(rawResult);

        return {
            success: true,
            result
        };

    } catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
}

/* =====================================================
   EXPORTS
===================================================== */

module.exports = {
    analyzeData,
    analyzeGeneral,
    detectOutliers,
    executeDanfoCode
};
