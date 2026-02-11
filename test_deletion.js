const fs = require('fs');
const path = require('path');

async function testDeletion() {
    console.log("🧪 Iniciando prueba de eliminación de sistema de archivos...");
    
    // 1. Crear directorio de prueba
    const testDir = path.join(__dirname, 'Servidor', 'trained_models', 'TEST_DELETE_ME_' + Date.now());
    console.log(`📂 Creando directorio de prueba: '${testDir}'`);
    
    try {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        // Crear un archivo dentro
        fs.writeFileSync(path.join(testDir, 'test.txt'), 'Hola mundo');
        
        console.log(`✅ Directorio creado. Exists: ${fs.existsSync(testDir)}`);
        
        // 2. Intentar eliminar con la misma lógica del controlador
        const modelPath = testDir; // Simula lo que viene de la BD
        
        console.log(`🗑️ Intentando eliminar: '${modelPath}'`);
        
        if (modelPath && fs.existsSync(modelPath)) {
            try {
                fs.rmSync(modelPath, { recursive: true, force: true });
                console.log(`✅ rmSync completado sin errores.`);
            } catch (err) {
                console.error(`❌ Error en fs.rmSync: ${err.message}`);
            }
        } else {
            console.warn(`⚠️ Path no encontrado o inaccesible (fs.existsSync=false): '${modelPath}'`);
        }
        
        // 3. Verificar
        if (!fs.existsSync(testDir)) {
            console.log("✨ ÉXITO: El directorio fue eliminado correctamente.");
        } else {
            console.error("⛔ FALLO: El directorio todavía existe.");
        }
        
    } catch (error) {
        console.error("❌ Error general:", error);
    }
}

testDeletion();
