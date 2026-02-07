const { dbConnection } = require('../database/config');
const { response } = require('express');

// Helper para ejecutar queries, ya que dbConnection devuelve el pool directamente
// OJO: en config.js vimos que exporta { dbConnection: () => pool }
const getPool = require('../database/config').dbConnection;

const getCaracterizacion = async (req, res = response) => {
    const pool = getPool();
    try {
        const { rows } = await pool.query('SELECT * FROM caracterizacion ORDER BY id DESC LIMIT 100'); // Limitamos a 100 por seguridad inicial
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener caracterizacion:', error);
        res.status(500).json({
            msg: 'Error interno al obtener datos de caracterizacion'
        });
    }
}

const getComparacion = async (req, res = response) => {
    const pool = getPool();
    try {
        const { rows } = await pool.query('SELECT * FROM comparacion ORDER BY id DESC LIMIT 100');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener comparacion:', error);
        res.status(500).json({
            msg: 'Error interno al obtener datos de comparacion'
        });
    }
}

const getDatalogger = async (req, res = response) => {
    const pool = getPool();
    try {
        const { rows } = await pool.query('SELECT * FROM datalogger ORDER BY id DESC LIMIT 100');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener datalogger:', error);
        res.status(500).json({
            msg: 'Error interno al obtener datos de datalogger'
        });
    }
}
const getAnomalias = async (req, res = response) => {
    const pool = getPool();
    try {
        // Consultar Esp32_Log filtrando donde resultado->'isAnomaly' es true
        // El campo resultado es JSONB.
        const query = `
            SELECT * FROM Esp32_Log 
            WHERE (resultado->>'isAnomaly')::boolean IS TRUE 
            ORDER BY created_at DESC 
            LIMIT 100
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener anomalias:', error);
        res.status(500).json({
            msg: 'Error interno al obtener datos de anomalias'
        });
    }
}

const getDevices = async (req, res = response) => {
    const pool = getPool();
    try {
        const query = `SELECT DISTINCT device_uid FROM Esp32_Log ORDER BY device_uid ASC`;
        const { rows } = await pool.query(query);
        // Retornamos un array simple de strings
        res.json(rows.map(r => r.device_uid));
    } catch (error) {
        console.error('Error al obtener devices:', error);
        res.status(500).json({
            msg: 'Error interno al obtener lista de dispositivos'
        });
    }
}

const getLogsByDevices = async (req, res = response) => {
    const pool = getPool();
    const { devices } = req.body; 
    console.log("🔍 [DataController] Solicitud de logs para:", devices);

    if (!devices || !Array.isArray(devices) || devices.length === 0) {
        console.log("⚠️ [DataController] Sin dispositivos, retornando []");
        return res.json([]); 
    }

    try {
        // Usamos ANY($1) para filtrar por el array de dispositivos
        const query = `
            SELECT * FROM Esp32_Log 
            WHERE device_uid = ANY($1) 
            ORDER BY created_at DESC 
            LIMIT 500
        `; 
        // Limitamos a 500 por seguridad de rendimiento inicial, orden DESC para ver lo último
        // Para análisis histórico, quizás necesitamos más o un rango de fechas, pero empecemos con los últimos 500 registros.
        
        const { rows } = await pool.query(query, [devices]);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener logs por dispositivos:', error);
        res.status(500).json({
            msg: 'Error interno al obtener logs'
        });
    }
};

/**
 * Get trained models history from filesystem
 */
const getTrainedModels = async (req, res = response) => {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const { device_uid } = req.query;
        const modelsDir = path.join(__dirname, '..', 'trained_models');
        
        if (!fs.existsSync(modelsDir)) {
            return res.json([]);
        }
        
        const folders = fs.readdirSync(modelsDir);
        const models = [];
        
        for (const folder of folders) {
            const metadataPath = path.join(modelsDir, folder, 'metadata.json');
            
            if (fs.existsSync(metadataPath)) {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                
                // Filter by device if requested
                if (!device_uid || metadata.device_uid === device_uid) {
                    models.push({
                        id: folder, // Use folder name as ID
                        model_path: path.join(modelsDir, folder),
                        ...metadata
                    });
                }
            }
        }
        
        // Sort by trained_at descending
        models.sort((a, b) => new Date(b.trained_at) - new Date(a.trained_at));
        
        res.json(models);
    } catch (error) {
        console.error('Error al obtener modelos entrenados:', error);
        res.status(500).json({
            msg: 'Error interno al obtener modelos entrenados'
        });
    }
};

/**
 * Activate a specific model (filesystem-based)
 */
const activateModel = async (req, res = response) => {
    const fs = require('fs');
    const path = require('path');
    const { model_id } = req.params; // This is the folder name
    
    try {
        const modelsDir = path.join(__dirname, '..', 'trained_models');
        const targetMetadataPath = path.join(modelsDir, model_id, 'metadata.json');
        
        if (!fs.existsSync(targetMetadataPath)) {
            return res.status(404).json({ msg: 'Model not found' });
        }
        
        // Read target model metadata
        const targetMetadata = JSON.parse(fs.readFileSync(targetMetadataPath, 'utf8'));
        const deviceUid = targetMetadata.device_uid;
        
        // Deactivate all models for this device
        const folders = fs.readdirSync(modelsDir);
        for (const folder of folders) {
            const metadataPath = path.join(modelsDir, folder, 'metadata.json');
            
            if (fs.existsSync(metadataPath)) {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                
                if (metadata.device_uid === deviceUid) {
                    metadata.is_active = false;
                    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
                }
            }
        }
        
        // Activate target model
        targetMetadata.is_active = true;
        fs.writeFileSync(targetMetadataPath, JSON.stringify(targetMetadata, null, 2));
        
        console.log(`✅ Modelo ${model_id} activado para dispositivo ${deviceUid}`);
        res.json({ ok: true, model: targetMetadata });
    } catch (error) {
        console.error('Error al activar modelo:', error);
        res.status(500).json({
            msg: 'Error interno al activar modelo'
        });
    }
};

module.exports = {
    getCaracterizacion,
    getComparacion,
    getDatalogger,
    getAnomalias,
    getDevices,
    getLogsByDevices,
    getTrainedModels,
    activateModel
};

/**
 * Start manual training with custom parameters
 */
const manualTrain = async (req, res = response) => {
    const SvmService = require('../services/SvmService');
    const { device_uid, max_samples, batches_required } = req.body;
    
    try {
        if (!device_uid || !max_samples || !batches_required) {
            return res.status(400).json({
                msg: 'Faltan parámetros: device_uid, max_samples, batches_required'
            });
        }

        // Trigger manual training
        const result = await SvmService.startManualTraining(device_uid, max_samples, batches_required);
        
        res.json({
            ok: true,
            msg: 'Entrenamiento iniciado',
            data: result
        });
    } catch (error) {
        console.error('Error en entrenamiento manual:', error);
        res.status(500).json({
            msg: 'Error al iniciar entrenamiento',
            error: error.message
        });
    }
};

module.exports = {
    getCaracterizacion,
    getComparacion,
    getDatalogger,
    getAnomalias,
    getDevices,
    getLogsByDevices,
    getTrainedModels,
    activateModel,
    manualTrain
};
