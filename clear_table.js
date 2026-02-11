require('./Servidor/node_modules/dotenv').config({ path: './Servidor/.env' });
const { dbConnection } = require('./Servidor/database/config');

async function clearTable() {
    console.log("🧹 Limpiando tabla Esp32_Trained_Models...");
    try {
        const pool = await dbConnection();
        await pool.query('TRUNCATE TABLE Esp32_Trained_Models RESTART IDENTITY');
        console.log("✅ Tabla vaciada.");
    } catch (error) {
        console.error("❌ Error vaciando tabla:", error);
    } finally {
        process.exit();
    }
}

clearTable();
