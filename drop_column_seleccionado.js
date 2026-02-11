require('./Servidor/node_modules/dotenv').config({ path: './Servidor/.env' });
const { dbConnection } = require('./Servidor/database/config');

async function dropColumn() {
    console.log("🛠️ Eliminando columna 'seleccionado' de Esp32_Trained_Models...");
    
    try {
        const pool = await dbConnection();
        
        // Intentar eliminar con nombre en minúsculas (Postgres standard)
        await pool.query(`
            ALTER TABLE esp32_trained_models 
            DROP COLUMN IF EXISTS seleccionado
        `);
        console.log("✅ Columna 'seleccionado' eliminada correctamente.");
        
        // Verificamos estructura final
        const cols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name='esp32_trained_models'
        `);
        console.log("📊 Estructura actual:", cols.rows.map(c => `${c.column_name} (${c.data_type})`));

    } catch (error) {
        console.error("❌ Error eliminando columna:", error);
    } finally {
        process.exit();
    }
}

dropColumn();
