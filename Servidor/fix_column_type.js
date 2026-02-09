const { dbConnection } = require('./database/config');

async function fixTrainingHistoryColumn() {
    try {
        console.log("🔧 Verificando y corrigiendo tipo de columna training_history...\n");
        
        const pool = await dbConnection();
        
        // Check current column type
        const typeCheck = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'esp32_trained_models' 
            AND column_name = 'training_history'
        `);
        
        if (typeCheck.rows.length > 0) {
            console.log(`📊 Tipo actual: ${typeCheck.rows[0].data_type}`);
        }
        
        // Alter column to ensure it's JSONB
        console.log("🔄 Modificando columna a tipo JSONB...");
        await pool.query(`
            ALTER TABLE Esp32_Trained_Models 
            ALTER COLUMN training_history TYPE JSONB USING training_history::jsonb
        `);
        
        console.log("✅ Columna training_history ahora es tipo JSONB");
        
        // Verify
        const verifyCheck = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'esp32_trained_models' 
            AND column_name = 'training_history'
        `);
        
        console.log(`✅ Tipo verificado: ${verifyCheck.rows[0].data_type}`);
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        process.exit();
    }
}

fixTrainingHistoryColumn();
