const { dbConnection } = require('./database/config');
const TrainedModelModel = require('./models/TrainedModelModel');
const path = require('path');
const fs = require('fs');

async function importExistingModels() {
    try {
        console.log("📦 Importando modelos existentes a la base de datos...\n");
        
        const MODELS_DIR = path.join(__dirname, 'trained_models');
        
        if (!fs.existsSync(MODELS_DIR)) {
            console.log("⚠️  No existe el directorio trained_models");
            return;
        }

        const folders = fs.readdirSync(MODELS_DIR);
        let imported = 0;
        let skipped = 0;

        for (const folder of folders) {
            const modelPath = path.join(MODELS_DIR, folder);
            const metadataPath = path.join(modelPath, 'metadata.json');
            
            if (!fs.existsSync(metadataPath)) {
                console.log(`⏩ Saltando ${folder} (no metadata.json)`);
                skipped++;
                continue;
            }

            try {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                
                console.log(`\n📊 Procesando: ${folder}`);
                console.log(`   Device: ${metadata.device_uid}`);
                console.log(`   Samples: ${metadata.samples_count}`);
                console.log(`   Final Loss: ${metadata.final_loss}`);
                
                // Import to database
                const result = await TrainedModelModel.create(
                    metadata.device_uid,
                    modelPath, // Full path
                    metadata.samples_count,
                    metadata.batches_count,
                    metadata.threshold,
                    metadata.training_history, // Pass as object, not string
                    metadata.final_loss
                );
                
                console.log(`   ✅ Importado con ID: ${result.id}`);
                imported++;
                
            } catch (error) {
                console.error(`   ❌ Error importando ${folder}:`, error.message);
                skipped++;
            }
        }

        console.log(`\n✅ Importación completada:`);
        console.log(`   - Importados: ${imported}`);
        console.log(`   - Saltados: ${skipped}`);
        
        // Verify
        const pool = await dbConnection();
        const result = await pool.query('SELECT COUNT(*) FROM Esp32_Trained_Models');
        console.log(`\n📊 Total de modelos en BD: ${result.rows[0].count}`);

    } catch (error) {
        console.error("❌ Error en importación:", error);
    } finally {
        process.exit();
    }
}

importExistingModels();
