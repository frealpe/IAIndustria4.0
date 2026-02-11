require('./Servidor/node_modules/dotenv').config({ path: './Servidor/.env' });
const { dbConnection } = require('./Servidor/database/config');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, 'Servidor', 'trained_models');

async function cleanup() {
    console.log("🧹 Iniciando limpieza de modelos huérfanos...");
    
    try {
        const pool = await dbConnection();
        
        // 1. Obtener todos los paths de la BD
        const { rows } = await pool.query('SELECT model_path FROM Esp32_Trained_Models');
        const dbPaths = new Set(rows.map(r => r.model_path));
        
        console.log(`📊 Modelos en BD: ${dbPaths.size}`);
        
        // 2. Leer carpetas en disco
        if (!fs.existsSync(MODELS_DIR)) {
            console.log("⚠️ El directorio trained_models no existe.");
            return;
        }
        
        const folders = fs.readdirSync(MODELS_DIR);
        console.log(`📂 Carpetas en disco: ${folders.length}`);
        
        let cleaned = 0;
        
        for (const folder of folders) {
            const fullPath = path.join(MODELS_DIR, folder);
            
            // Ignorar archivos que no sean carpetas (como .gitkeep si hubiera)
            if (!fs.statSync(fullPath).isDirectory()) continue;
            
            // Verificar si existe en BD
            // Nota: dbPaths tiene paths absolutos. fullPath es absoluto.
            // Debemos comparar con cuidado.
            
            let isTracked = false;
            // Búsqueda simple (exact absolute path match)
            if (dbPaths.has(fullPath)) {
                isTracked = true;
            }
            
            if (!isTracked) {
                console.log(`🗑️ HUÉRFANO DETECTADO: ${folder}`);
                console.log(`   Path: ${fullPath}`);
                
                try {
                    fs.rmSync(fullPath, { recursive: true, force: true });
                    console.log("   ✅ Eliminado.");
                    cleaned++;
                } catch (e) {
                    console.error("   ❌ Error eliminando:", e.message);
                }
            } else {
                console.log(`✅ OK (En BD): ${folder}`);
            }
        }
        
        console.log(`✨ Limpieza finalizada. Eliminados: ${cleaned}`);
        
    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        process.exit();
    }
}

cleanup();
