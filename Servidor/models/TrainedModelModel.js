const { dbConnection } = require('../database/config');

/**
 * Model para gestionar modelos de IA entrenados (Esp32_Trained_Models)
 */
class TrainedModelModel {
    
    /**
     * Inicializa la tabla de modelos entrenados
     */
    static async initTable() {
        const pool = await dbConnection();
        
        const query = `
            CREATE TABLE IF NOT EXISTS Esp32_Trained_Models (
                id SERIAL PRIMARY KEY,
                device_uid VARCHAR(50) NOT NULL,
                model_path TEXT NOT NULL,
                trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                samples_count INTEGER NOT NULL,
                batches_count INTEGER NOT NULL,
                threshold FLOAT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                version VARCHAR(50) DEFAULT '1.0',
                training_history JSONB,
                final_loss FLOAT
            );
        `;
        
        try {
            await pool.query(query);
            console.log("✅ Tabla 'Esp32_Trained_Models' verificada/creada");
        } catch (error) {
            console.error("❌ Error creando tabla Esp32_Trained_Models:", error);
            throw error;
        }
    }

    /**
     * Registra un nuevo modelo entrenado
     */
    static async create(deviceUid, modelPath, samplesCount, batchesCount, threshold, trainingHistory = null, finalLoss = null) {
        const pool = await dbConnection();
        
        try {
            console.log(`🔄 [DB] Desactivando modelos anteriores para ${deviceUid}...`);
            
            // Desactivar modelos anteriores del mismo dispositivo
            const updateResult = await pool.query(
                'UPDATE Esp32_Trained_Models SET is_active = FALSE WHERE device_uid = $1',
                [deviceUid]
            );
            
            console.log(`🔄 [DB] ${updateResult.rowCount} modelo(s) desactivado(s)`);

            // JSONB columns accept JSON strings - we explicitly stringify the array
            // This prevents the pg driver from incorrectly serializing the array
            const historyJson = trainingHistory ? JSON.stringify(trainingHistory) : null;

            console.log(`📝 [DB] Insertando nuevo modelo activo...`);
            console.log(`📝 [DB] History preview:`, historyJson ? historyJson.substring(0, 100) + '...' : 'null');
            
            // Insertar nuevo modelo como activo
            const result = await pool.query(
                `INSERT INTO Esp32_Trained_Models 
                (device_uid, model_path, samples_count, batches_count, threshold, is_active, training_history, final_loss) 
                VALUES ($1, $2, $3, $4, $5, TRUE, $6::jsonb, $7) 
                RETURNING *`,
                [deviceUid, modelPath, samplesCount, batchesCount, threshold, historyJson, finalLoss]
            );

            console.log(`✅ [DB] Modelo registrado exitosamente en BD (ID: ${result.rows[0].id}): ${modelPath}`);
            console.log(`✅ [DB] is_active = ${result.rows[0].is_active}`);
            
            return result.rows[0];
        } catch (error) {
            console.error("❌ [DB] Error registrando modelo entrenado:", error);
            console.error("❌ [DB] Error details:", {
                message: error.message,
                code: error.code,
                detail: error.detail,
                deviceUid,
                modelPath
            });
            throw error;
        }
    }

    /**
     * Obtiene el modelo activo para un dispositivo
     */
    static async getActiveModel(deviceUid) {
        const pool = await dbConnection();
        
        try {
            const result = await pool.query(
                'SELECT * FROM Esp32_Trained_Models WHERE device_uid = $1 AND is_active = TRUE ORDER BY trained_at DESC LIMIT 1',
                [deviceUid]
            );
            
            return result.rows[0] || null;
        } catch (error) {
            console.error("❌ Error obteniendo modelo activo:", error);
            return null;
        }
    }

    /**
     * Obtiene todos los modelos de un dispositivo
     */
    static async getModelHistory(deviceUid) {
        const pool = await dbConnection();
        
        try {
            const result = await pool.query(
                'SELECT * FROM Esp32_Trained_Models WHERE device_uid = $1 ORDER BY trained_at DESC',
                [deviceUid]
            );
            
            return result.rows;
        } catch (error) {
            console.error("❌ Error obteniendo historial de modelos:", error);
            return [];
        }
    }

    /**
     * Activa un modelo específico (desactiva los demás del mismo dispositivo)
     */
    static async setActiveModel(modelId) {
        const pool = await dbConnection();
        
        try {
            // Get device_uid from the model
            const modelResult = await pool.query(
                'SELECT device_uid FROM Esp32_Trained_Models WHERE id = $1',
                [modelId]
            );
            
            if (modelResult.rows.length === 0) {
                throw new Error('Model not found');
            }
            
            const deviceUid = modelResult.rows[0].device_uid;
            
            // Deactivate all models for this device
            await pool.query(
                'UPDATE Esp32_Trained_Models SET is_active = FALSE WHERE device_uid = $1',
                [deviceUid]
            );
            
            // Activate the selected model
            const result = await pool.query(
                'UPDATE Esp32_Trained_Models SET is_active = TRUE WHERE id = $1 RETURNING *',
                [modelId]
            );
            
            console.log(`✅ Modelo ${modelId} activado para dispositivo ${deviceUid}`);
            return result.rows[0];
        } catch (error) {
            console.error("❌ Error activando modelo:", error);
            throw error;
        }
    }

    /**
     * Obtiene un modelo por ID
     */
    static async getById(modelId) {
        const pool = await dbConnection();
        try {
            const result = await pool.query('SELECT * FROM Esp32_Trained_Models WHERE id = $1', [modelId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error("❌ Error obteniendo modelo por ID:", error);
            throw error;
        }
    }

    /**
     * Elimina un modelo de la BD
     */
    static async delete(modelId) {
        const pool = await dbConnection();
        try {
            await pool.query('DELETE FROM Esp32_Trained_Models WHERE id = $1', [modelId]);
            console.log(`🗑️ Modelo ${modelId} eliminado de la BD`);
            return true;
        } catch (error) {
            console.error("❌ Error eliminando modelo de BD:", error);
            throw error;
        }
    }
}

module.exports = TrainedModelModel;
