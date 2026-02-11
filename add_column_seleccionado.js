require('./Servidor/node_modules/dotenv').config({ path: './Servidor/.env' });
const { dbConnection } = require('./Servidor/database/config');

async function addColumn() {
    console.log("🛠️ Agregando columna 'seleccionado' a Esp32_Trained_Models...");
    
    try {
        const pool = await dbConnection();
        
        // Check if column exists
        const check = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='esp32_trained_models' AND column_name='seleccionado'
        `);

        if (check.rows.length > 0) {
            console.log("⚠️ La columna 'seleccionado' ya existe.");
        } else {
            await pool.query(`
                ALTER TABLE Esp32_Trained_Models 
                ADD COLUMN seleccionado BOOLEAN DEFAULT FALSE
            `);
            console.log("✅ Columna 'seleccionado' agregada correctamente.");
        }
        
        // Verificamos estructura final
        const cols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name='esp32_trained_models'
        `);
        console.log("📊 Estructura actual:", cols.rows.map(c => `${c.column_name} (${c.data_type})`));

    } catch (error) {
        console.error("❌ Error agregando columna:", error);
    } finally {
        process.exit();
    }
}

addColumn();
