const { dbConnection } = require('./database/config');
const path = require('path');

async function verifyModelPaths() {
    try {
        console.log("🔍 Verificando rutas de modelos en la base de datos...\n");
        const pool = await dbConnection();

        // Obtener todos los modelos de la tabla
        const result = await pool.query('SELECT * FROM Esp32_Trained_Models ORDER BY trained_at DESC');
        
        if (result.rows.length === 0) {
            console.log("⚠️  No hay modelos guardados en la base de datos.");
            return;
        }

        console.log(`✅ Se encontraron ${result.rows.length} modelo(s):\n`);
        
        result.rows.forEach((model, index) => {
            console.log(`📊 Modelo #${index + 1}:`);
            console.log(`   ID: ${model.id}`);
            console.log(`   Device UID: ${model.device_uid}`);
            console.log(`   Ruta del modelo: ${model.model_path}`);
            console.log(`   Fecha de entrenamiento: ${model.trained_at}`);
            console.log(`   Muestras: ${model.samples_count}`);
            console.log(`   Lotes: ${model.batches_count}`);
            console.log(`   Umbral: ${model.threshold}`);
            console.log(`   Loss final: ${model.final_loss}`);
            console.log(`   Activo: ${model.is_active ? '✅ Sí' : '❌ No'}`);
            console.log(`   Versión: ${model.version}`);
            console.log('');
        });

        // Verificar que la ruta esperada está presente
        const expectedBasePath = path.join(__dirname, 'trained_models');
        console.log(`📂 La ruta base esperada es: ${expectedBasePath}`);
        console.log('');

        result.rows.forEach((model) => {
            if (model.model_path && model.model_path.includes(expectedBasePath)) {
                console.log(`✅ Modelo ${model.id}: La ruta contiene la ruta base correcta`);
            } else {
                console.log(`⚠️  Modelo ${model.id}: La ruta NO contiene la ruta base esperada`);
            }
        });

    } catch (error) {
        console.error("❌ Error verificando rutas de modelos:", error);
    } finally {
        process.exit();
    }
}

verifyModelPaths();
