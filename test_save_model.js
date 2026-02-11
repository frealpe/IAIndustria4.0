require('./Servidor/node_modules/dotenv').config({ path: './Servidor/.env' });
const TrainedModelModel = require('./Servidor/models/TrainedModelModel');
const path = require('path');

async function testSave() {
    console.log("🧪 Simulando guardado de modelo tras entrenamiento...");
    
    const deviceUid = 'ESP32DDEF49C0F4A8'; // El real
    const dummyPath = path.join(__dirname, 'Servidor', 'trained_models', 'SIMULATED_MODEL_' + Date.now());
    
    try {
        console.log(`📝 Guardando para: ${deviceUid}`);
        const result = await TrainedModelModel.create(
            deviceUid,
            dummyPath,
            500, // samples
            50,  // batches
            0.05, // threshold
            JSON.stringify([{epoch: 1, loss: 0.1}]),
            0.05 // final_loss
        );
        
        console.log("✅ Resultado DB:", result);
        
        if (result && result.id) {
            console.log("✨ ÉXITO: El modelo se insertó correctamente en la BD.");
            
            // Verificar lectura inmediata
            const active = await TrainedModelModel.getActiveModel(deviceUid);
            console.log("🔍 Lectura post-guardado (Active Model):", active ? `ID ${active.id} Pointing to ${active.model_path}` : "NULL");
            
            if (active && active.id === result.id) {
                 console.log("✅ Verificación completada: El modelo guardado es ahora el activo.");
            } else {
                 console.error("❌ Error de verificación: El modelo activo no coincide.");
            }
            
        } else {
            console.error("❌ Falló la inserción.");
        }

    } catch (error) {
        console.error("❌ Error en test:", error);
    } finally {
        process.exit();
    }
}

testSave();
