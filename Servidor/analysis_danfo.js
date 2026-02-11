const { dbConnection } = require('./database/config');
const dfd = require("danfojs-node");

async function analyzeData() {
    const pool = await dbConnection();
    
    try {
        console.log("--> [Paso 1: Análisis de Datos] Conectando a DB y obteniendo muestra...");
        
        // Fetch last 500 records for meaningful trend analysis
        const query = `
            SELECT 
                created_at, 
                mean::float as voltage, 
                (resultado->>'isAnomaly')::boolean as is_anomaly,
                (resultado->>'loss')::float as loss
            FROM datos 
            WHERE mean IS NOT NULL
            ORDER BY created_at DESC 
            LIMIT 500
        `;
        
        const { rows } = await pool.query(query);
        
        if (rows.length === 0) {
            console.log("No data found.");
            return;
        }

        console.log(` Datos recuperados: ${rows.length} registros.`);

        console.log("\n--> [Paso 2: Generación de Código (Danfo.js) y Ejecución]");
        
        // --- DANFO.JS LOGIC START ---
        
        // 1. Load data into DataFrame
        // We reverse rows to have chronological order for trend analysis
        const df = new dfd.DataFrame(rows.reverse());

        // 2. Basic Cleaning (Handling NaNs if any slipped through, though SQL filtered mean)
        const cleanDf = df.dropNa({ axis: 0 });

        // 3. Requirement: "Analyze Voltage Stability and Anomaly Distribution"
        
        // Calculate Statistics
        const meanVoltage = cleanDf['voltage'].mean();
        const stdVoltage = cleanDf['voltage'].std();
        const maxVoltage = cleanDf['voltage'].max();
        const minVoltage = cleanDf['voltage'].min();

        // Anomaly Analysis
        const anomalyCount = cleanDf['is_anomaly'].values.filter(v => v === true).length;
        const totalCount = cleanDf.shape[0];
        const anomalyRate = (anomalyCount / totalCount) * 100;

        // Group by Anomaly status (Robust method using query/filter)
        // Note: is_anomaly is boolean in DB but Danfo might treat it differently depending on loader. 
        // Let's use filter values
        const normalMean = cleanDf['voltage'].values.filter((v, i) => cleanDf['is_anomaly'].values[i] === false)
            .reduce((a, b) => a + b, 0) / (totalCount - anomalyCount || 1);
            
        const anomalyMean = cleanDf['voltage'].values.filter((v, i) => cleanDf['is_anomaly'].values[i] === true)
            .reduce((a, b) => a + b, 0) / (anomalyCount || 1);
        
        // Trend Analysis (Approximate trend using last 20 vs global)
        const last20 = cleanDf.tail(20);
        const currentTrend = last20['voltage'].mean();
        
        // Prepare Results Object
        const results = {
            total_samples: totalCount,
            voltage_stats: {
                mean: parseFloat(meanVoltage.toFixed(4)),
                std_dev: parseFloat(stdVoltage.toFixed(4)),
                min: minVoltage,
                max: maxVoltage
            },
            anomalies: {
                count: anomalyCount,
                rate_percentage: parseFloat(anomalyRate.toFixed(2)),
                avg_voltage_normal: parseFloat(normalMean.toFixed(4)),
                avg_voltage_anomaly: parseFloat(anomalyMean.toFixed(4))
            },
            trend: {
                current_moving_avg: parseFloat(currentTrend.toFixed(4)),
                direction: currentTrend > meanVoltage ? "Arriba del promedio" : "Abajo del promedio"
            }
        };

        // --- DANFO.JS LOGIC END ---

        console.log("\n--> [Paso 3: Simula e Inyección - Resultados Obtenidos]");
        console.log(JSON.stringify(results, null, 2));

        console.log("\n--> [Paso 4: Análisis de Respuesta (Insights Estratégicos)]");
        
        // Generate insights
        let insight = "";
        if (anomalyRate > 10) {
            insight += "⚠️ ALERTA CRÍTICA: La tasa de anomalías supera el 10%. ";
        } else if (anomalyRate > 0) {
            insight += "⚠️ ATENCIÓN: Se detectaron anomalías esporádicas. ";
        } else {
            insight += "✅ ESTABLE: Operación normal sin anomalías recientes. ";
        }

        if (stdVoltage > 0.5) { // Threshold assumed for example
            insight += "La variabilidad del voltaje es alta, sugiriendo inestabilidad en la fuente de alimentación o ruido en el sensor.";
        } else {
            insight += "El voltaje es estable con baja variabilidad.";
        }

        console.log(`Insight: ${insight}`);
        console.log(`Recomendación: ${anomalyRate > 5 ? "Revisar conexiones físicas del sensor y calibración inmediatamente." : "Continuar monitoreo estándar."}`);

    } catch (error) {
        console.error("Error en análisis:", error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

analyzeData();
