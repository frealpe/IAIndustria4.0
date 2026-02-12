const { dbConnection } = require('../database/config');
const { response } = require('express');

// Helper para ejecutar queries, ya que dbConnection devuelve el pool directamente
// OJO: en config.js vimos que exporta { dbConnection: () => pool }
const getPool = require('../database/config').dbConnection;
const DeviceModel = require('../models/DeviceModel');

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
        // Obtener los últimos 20 registros del primer dispositivo
        const query = `SELECT * FROM datos ORDER BY created_at DESC LIMIT 20`;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener datalogger:', error);
        res.status(500).json({
            msg: 'Error interno al obtener datos del datalogger'
        });
    }
}

// Get recent logs for real-time chart (last N records)
const getRecentLogs = async (req, res = response) => {
    const { limit = 500, device_uid } = req.query;
    const pool = getPool();
    try {
        let query = `SELECT * FROM datos `;
        const params = [];
        
        if (device_uid) {
            query += `WHERE device_uid = $1 `;
            params.push(device_uid);
        }
        
        query += `ORDER BY created_at DESC LIMIT $${params.length + 1}`;
        params.push(parseInt(limit));
        
        const { rows } = await pool.query(query, params);
        // Reverse to get chronological order (oldest to newest)
        const chronologicalRows = rows.reverse();
        
        console.log(`📊 [Backend] getRecentLogs: Returning ${chronologicalRows.length} logs`);
        res.json(chronologicalRows);
    } catch (error) {
        console.error('Error al obtener logs recientes:', error);
        res.status(500).json({
            msg: 'Error interno al obtener logs recientes'
        });
    }
}
const getAnomalias = async (req, res = response) => {
    const pool = getPool();
    const { device_uid, startDate, endDate } = req.query; 
    try {
        let query = `
            SELECT * FROM datos 
            WHERE (
                (resultado->>'isAnomaly')::boolean IS TRUE OR 
                (resultado->>'is_anomaly')::boolean IS TRUE OR 
                (resultado->>'isAnomaly') = 'true' OR
                (resultado->>'is_anomaly') = 'true'
            )
        `;
        
        const params = [];
        if (device_uid) {
            query += ` AND device_uid = $${params.length + 1} `;
            params.push(device_uid);
        }

        if (startDate) {
            query += ` AND created_at >= $${params.length + 1} `;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND created_at <= $${params.length + 1} `;
            params.push(endDate);
        }

        query += `
            ORDER BY created_at DESC 
            LIMIT 200
        `;
        
        const { rows } = await pool.query(query, params);
        console.log(`📊 [Backend] getAnomalias: Found ${rows.length} anomalies${device_uid ? ` for ${device_uid}` : ''} (Filter: ${startDate || 'N/A'} - ${endDate || 'N/A'})`);
        
        if (rows.length > 0) {
            console.log('📊 [Backend] First anomaly sample:', {
                id: rows[0].id,
                device_uid: rows[0].device_uid,
                created_at: rows[0].created_at,
                mean: rows[0].mean,
                resultado_type: typeof rows[0].resultado,
                resultado_keys: typeof rows[0].resultado === 'object' ? Object.keys(rows[0].resultado) : 'N/A'
            });
            if (typeof rows[0].resultado === 'string') {
                console.log('⚠️ [Backend] resultado is a STRING, needs parsing!');
            }
        }
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener anomalias:', error);
        res.status(500).json({
            msg: 'Error interno al obtener datos de anomalias'
        });
    }
}

// Get ALL logs for a specific device (both normal and anomalies)
const getDeviceLogs = async (req, res = response) => {
    const { device_uid } = req.params;
    const { startDate, endDate } = req.query;
    
    console.log(`📥 [Backend] Request getDeviceLogs: 
        Device: ${device_uid}
        StartDate: ${startDate || 'N/A'}
        EndDate: ${endDate || 'N/A'}`);

    const pool = getPool();
    try {
        let query = `
            SELECT * FROM datos 
            WHERE device_uid = $1
        `;
        const params = [device_uid];

        if (startDate) {
            params.push(startDate);
            query += ` AND created_at >= $${params.length} `;
        }
        if (endDate) {
            params.push(endDate);
            query += ` AND created_at <= $${params.length} `;
        }

        // Si hay filtrado por fecha, permitimos traer más datos (hasta 2000)
        // Si no, mantenemos el límite de 500 para rendimiento real-time
        const limit = (startDate || endDate) ? 2000 : 500;

        query += `
            ORDER BY created_at DESC 
            LIMIT ${limit}
        `;
        
        const { rows } = await pool.query(query, params);
        console.log(`📊 [Backend] getDeviceLogs for ${device_uid}: Found ${rows.length} logs (Filter: ${startDate || 'N/A'} - ${endDate || 'N/A'}, Limit: ${limit})`);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener logs del dispositivo:', error);
        res.status(500).json({
            msg: 'Error interno al obtener logs del dispositivo'
        });
    }
}

const getDevices = async (req, res = response) => {
    const pool = getPool();
    try {
        // Get devices from Devices table
        const query = `SELECT DISTINCT device_uid FROM Devices WHERE is_active = TRUE ORDER BY device_uid ASC`;
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
            SELECT * FROM datos 
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
 * Get trained models history from Database
 */
const getTrainedModels = async (req, res = response) => {
    const ModeloEntrenado = require('../models/ModeloEntrenado');
    
    try {
        const { device_uid } = req.query;
        
        // If device_uid is provided, get history for that device
        // If not, we might need a new method in model or just return empty for safety
        // For now, let's assume filtering by device is preferred
        
        if (device_uid) {
            const models = await ModeloEntrenado.getModelHistory(device_uid);
            res.json(models);
        } else {
             // If no device specified, maybe return all? Or just empty.
             // Current FS logic returned everything. 
             // Let's implement a 'getAll' if needed, but for now let's query raw if model method missing
             // Or better, let's just stick to device filtering which is what frontend uses.
             const pool = getPool();
             const { rows } = await pool.query('SELECT * FROM modelo_entrenado ORDER BY trained_at DESC LIMIT 100');
             res.json(rows);
        }
    } catch (error) {
        console.error('Error al obtener modelos entrenados:', error);
        res.status(500).json({
            msg: 'Error interno al obtener modelos entrenados'
        });
    }
};

/**
 * Activate a specific model (Database-based)
 */
const activateModel = async (req, res = response) => {
    const ModeloEntrenado = require('../models/ModeloEntrenado');
    const { model_id } = req.params; 
    
    try {
        const result = await ModeloEntrenado.setActiveModel(model_id);
        res.json({ ok: true, model: result });
    } catch (error) {
        console.error('Error al activar modelo:', error);
        res.status(500).json({
            msg: 'Error interno al activar modelo'
        });
    }
};



/**
 * Delete a specific model (Database + Filesystem)
 */
async function deleteModel(req, res = response) {
    const ModeloEntrenado = require('../models/ModeloEntrenado');
    const fs = require('fs');
    const path = require('path');
    const { model_id } = req.params;

    try {
        // 1. Get model info first to find the path
        const model = await ModeloEntrenado.getById(model_id);
        
        if (!model) {
            return res.status(404).json({ msg: 'Model not found in DB' });
        }

        const modelPath = model.model_path;

        // 2. Delete from Database
        await ModeloEntrenado.delete(model_id);

        // 3. Delete from Filesystem
        console.log(`🗑️ Eliminando archivos en: ${modelPath}`);
        if (modelPath && fs.existsSync(modelPath)) {
            // Using recursive delete for directory
            try {
                fs.rmSync(modelPath, { recursive: true, force: true });
                console.log(`✅ Archivos eliminados exitosamente: ${modelPath}`);
            } catch (err) {
                console.error(`❌ Error en fs.rmSync: ${err.message}`);
            }
        } else {
            console.warn(`⚠️ Path no encontrado o inaccesible (fs.existsSync=false): ${modelPath}`);
        }

        res.json({ ok: true, msg: 'Modelo eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar modelo:', error);
        res.status(500).json({
            msg: 'Error interno al eliminar modelo',
            error: error.message
        });
    }
}

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

/**
 * Get all registered devices with full information
 */
const getAllDevices = async (req, res = response) => {
    try {
        const devices = await DeviceModel.getAll();
        res.json(devices);
    } catch (error) {
        console.error('Error al obtener todos los dispositivos:', error);
        res.status(500).json({
            msg: 'Error interno al obtener dispositivos'
        });
    }
};

/**
 * Create new device
 */
const createDevice = async (req, res = response) => {
    const { device_uid, mac_address, name, description } = req.body;
    
    try {
        if (!device_uid || !mac_address) {
            return res.status(400).json({
                msg: 'Faltan parámetros: device_uid y mac_address son requeridos'
            });
        }

        const device = await DeviceModel.create(device_uid, mac_address, name, description);
        res.json({ ok: true, device });
    } catch (error) {
        console.error('Error al crear dispositivo:', error);
        
        // Handle unique constraint violations
        if (error.code === '23505') {
            return res.status(409).json({
                msg: 'El dispositivo o MAC ya existe'
            });
        }
        
        res.status(500).json({
            msg: 'Error interno al crear dispositivo',
            error: error.message
        });
    }
};

/**
 * Update device
 */
const updateDevice = async (req, res = response) => {
    const { id } = req.params;
    const data = req.body;
    
    try {
        const device = await DeviceModel.update(id, data);
        res.json({ ok: true, device });
    } catch (error) {
        console.error('Error al actualizar dispositivo:', error);
        
        if (error.message === 'Dispositivo no encontrado') {
            return res.status(404).json({ msg: error.message });
        }
        
        // Handle unique constraint violations
        if (error.code === '23505') {
            return res.status(409).json({
                msg: 'El UID o MAC ya existe en otro dispositivo'
            });
        }
        
        res.status(500).json({
            msg: 'Error interno al actualizar dispositivo',
            error: error.message
        });
    }
};

/**
 * Delete device
 */
const deleteDevice = async (req, res = response) => {
    const { id } = req.params;
    
    try {
        const device = await DeviceModel.delete(id);
        res.json({ ok: true, device });
    } catch (error) {
        console.error('Error al eliminar dispositivo:', error);
        
        if (error.message === 'Dispositivo no encontrado') {
            return res.status(404).json({ msg: error.message });
        }
        
        res.status(500).json({
            msg: 'Error interno al eliminar dispositivo',
            error: error.message
        });
    }
}

module.exports = {
    getCaracterizacion,
    getComparacion,
    getDatalogger,
    getRecentLogs,
    getAnomalias,
    getDeviceLogs,
    getDevices,
    getLogsByDevices,
    getTrainedModels,
    activateModel,
    getAllDevices,
    createDevice,
    updateDevice,
    deleteDevice,
    deleteModel,
    manualTrain
};
