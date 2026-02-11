require('./Servidor/node_modules/dotenv').config({ path: './Servidor/.env' });
const { dbConnection } = require('./Servidor/database/config');

async function updateUid() {
    const oldUid = 'DEBUG_DEVICE_1770489774096';
    const newUid = 'ESP32DDEF49C0F4A8';

    console.log(`🔄 Actualizando modelo de ${oldUid} a ${newUid}...`);
    
    try {
        const pool = await dbConnection();
        
        const res = await pool.query(
            'UPDATE Esp32_Trained_Models SET device_uid = $1 WHERE device_uid = $2',
            [newUid, oldUid]
        );
        
        console.log(`✅ Registros actualizados: ${res.rowCount}`);
        
        if (res.rowCount > 0) {
            console.log("✨ El modelo ahora pertenece al dispositivo real.");
        } else {
            console.log("⚠️ No se encontró el modelo de debug. Verifique el UID antiguo.");
        }

    } catch (error) {
        console.error("❌ Error actualizando:", error);
    } finally {
        process.exit();
    }
}

updateUid();
