const { analyzeData, executeDanfoCode } = require('../helpers/analysisHelper');
const { dbConnection } = require('../database/config');
require('dotenv').config();

async function test() {
    console.log("🔍 Iniciando prueba de búsqueda avanzada...");
    const pool = dbConnection();
    
    // Simulación de SQL que el Agente generaría
    const sql = `
        SELECT 
            d.mean as voltaje, 
            d.resultado as res, 
            d.created_at 
        FROM datos d 
        JOIN Devices dev ON d.device_uid = dev.device_uid 
        WHERE dev.name ILIKE '%planta%1%' 
        ORDER BY d.created_at DESC 
        LIMIT 100
    `;
    
    try {
        const result = await pool.query(sql);
        console.log(`✅ SQL exitoso: ${result.rows.length} registros encontrados.`);
        
        if (result.rows.length === 0) {
            console.log("⚠️ No hay datos para Planta 1.");
            return;
        }

        // Aplanamos datos como lo hace McpService
        const finalData = result.rows.map(row => {
            let rowData = typeof row.res === 'string' ? JSON.parse(row.res) : row.res;
            return {
                voltaje: row.voltaje,
                created_at: row.created_at,
                ...rowData
            };
        });

        // Simulación de código Danfo que el Agente generaría usando los nuevos HELPERS
        const codigo = `
            const mean_v = df['voltaje'].mean();
            const loss_values = helpers.extractJson(df['res'], 'loss');
            const regression = helpers.regressionStats(loss_values.values);
            
            return {
                total_muestras: df.values.length,
                voltaje_medio: mean_v,
                tendencia_perdida: regression.slope || 0,
                anomalias_loss: helpers.zScoreOutliers(loss_values.values).outliers.length
            };
        `;

        console.log("🧪 Ejecutando análisis con Danfo y Helpers...");
        const analysis = executeDanfoCode(finalData, codigo);
        console.log("📊 RESULTADO DEL ANÁLISIS:");
        console.log(JSON.stringify(analysis, null, 2));

    } catch (err) {
        console.error("❌ Fallo en la prueba:", err.message);
    } finally {
        await pool.end();
    }
}

test();
