const { dbConnection } = require('./database/config');

async function cleanupTestModels() {
    try {
        console.log("🧹 Limpiando modelos de prueba...\n");
        const pool = await dbConnection();

        // Mostrar modelos actuales
        const beforeResult = await pool.query('SELECT * FROM Esp32_Trained_Models ORDER BY trained_at DESC');
        console.log(`📊 Modelos antes de la limpieza: ${beforeResult.rows.length}\n`);
        
        beforeResult.rows.forEach((model, index) => {
            console.log(`${index + 1}. ID: ${model.id}, Path: ${model.model_path}, Active: ${model.is_active}`);
        });

        // Eliminar todos los modelos con rutas que empiecen con /tmp/
        const deleteResult = await pool.query(
            "DELETE FROM Esp32_Trained_Models WHERE model_path LIKE '/tmp/%' RETURNING *"
        );

        console.log(`\n🗑️  Eliminados ${deleteResult.rows.length} modelos de prueba:`);
        deleteResult.rows.forEach((model) => {
            console.log(`   - ID: ${model.id}, Path: ${model.model_path}`);
        });

        // Mostrar modelos después de la limpieza
        const afterResult = await pool.query('SELECT * FROM Esp32_Trained_Models ORDER BY trained_at DESC');
        console.log(`\n✅ Modelos después de la limpieza: ${afterResult.rows.length}`);
        
        if (afterResult.rows.length > 0) {
            console.log('\n📋 Modelos restantes:');
            afterResult.rows.forEach((model, index) => {
                console.log(`${index + 1}. ID: ${model.id}, Path: ${model.model_path}, Active: ${model.is_active}`);
            });
        } else {
            console.log('\n✨ Base de datos limpia. Lista para entrenar modelos reales.');
        }

    } catch (error) {
        console.error("❌ Error limpiando modelos de prueba:", error);
    } finally {
        process.exit();
    }
}

cleanupTestModels();
