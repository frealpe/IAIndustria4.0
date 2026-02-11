require('./Servidor/node_modules/dotenv').config({ path: './Servidor/.env' });
const { dbConnection } = require('./Servidor/database/config');

async function debug() {
    try {
        const pool = await dbConnection();
        console.log("✅ Conexión DB Exitosa from Debug Script");

        // 1. Check if table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'esp32_trained_models'
            );
        `);
        console.log("📊 Tabla Existe:", tableCheck.rows[0].exists);

        if (tableCheck.rows[0].exists) {
            // 2. Count rows
            const count = await pool.query('SELECT COUNT(*) FROM Esp32_Trained_Models');
            console.log("🔢 Total Filas:", count.rows[0].count);

            // 3. Test Create
            console.log("🧪 Testing TrainedModelModel.create...");
            const TrainedModelModel = require('./Servidor/models/TrainedModelModel');
            try {
                const newModel = await TrainedModelModel.create(
                    'DEBUG_DEVICE_' + Date.now(),
                    '/tmp/debug_model_path',
                    100,
                    10,
                    0.05,
                    JSON.stringify([{epoch: 1, loss: 0.1}]),
                    0.1
                );
                console.log("✅ Model created successfully:", newModel.id);
            } catch (e) {
                console.error("❌ Model creation failed:", e);
            }

            // 4. Check specific device
            const targetUid = 'ESP32DDEF49C0F4A8';
            const specific = await pool.query('SELECT * FROM Esp32_Trained_Models WHERE device_uid = $1', [targetUid]);
            console.log(`🔎 Modelos para ${targetUid}:`, specific.rows.length);
            specific.rows.forEach(r => {
                 console.log(`   [ID ${r.id}] Active: ${r.is_active}, Path: ${r.model_path}`);
            });

            // 5. Show last 5 rows details
            const rows = await pool.query('SELECT id, device_uid, model_path, is_active FROM Esp32_Trained_Models ORDER BY id DESC LIMIT 5');
            console.log("📋 Últimos 5 registros:");
            console.log(JSON.stringify(rows.rows, null, 2));
        }

    } catch (error) {
        console.error("❌ Error en Debug DB:", error);
    } finally {
        process.exit();
    }
}

debug();
