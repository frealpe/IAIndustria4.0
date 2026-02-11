const { dbConnection } = require('../database/config');

/**
 * Model para gestionar modelos de IA entrenados (Esp32_Trained_Models)
 */
const ModeloEntrenado = {
    
    /**
     * Inicializa la tabla de modelos entrenados
     */
    async init() {
        const pool = await dbConnection();
        
        const query = `
            CREATE TABLE IF NOT EXISTS modelo_entrenado (
                id SERIAL PRIMARY KEY,
                device_uid VARCHAR(50) NOT NULL,
                model_path TEXT NOT NULL,
                accuracy NUMERIC,
                epochs INTEGER,
                loss NUMERIC,
                is_active BOOLEAN DEFAULT FALSE,
                trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_device FOREIGN KEY (device_uid) REFERENCES Devices(device_uid) ON DELETE CASCADE
            );
        `;
        
        try {
            await pool.query(query);
            console.log("✅ Tabla 'modelo_entrenado' verificada/creada");
        } catch (error) {
            console.error("❌ Error creando tabla modelo_entrenado:", error);
        }
    },

    /**
     * Guarda un nuevo modelo entrenado en la BD
     */
    async create(deviceUid, modelPath, samplesCount, batchesCount, threshold, trainingHistory, finalLoss) {
        const pool = await dbConnection();

        try {
            // Desactivar modelos anteriores para este dispositivo
            await pool.query(
                'UPDATE modelo_entrenado SET is_active = FALSE WHERE device_uid = $1',
                [deviceUid]
            );

            // Insertar nuevo modelo
            const query = `INSERT INTO modelo_entrenado 
                (device_uid, model_path, accuracy, epochs, loss, is_active, trained_at)
                VALUES ($1, $2, 0, $3, $4, TRUE, NOW())
                RETURNING *`;
            
            // Note: Adapting args to schema. 
            // The original create had (deviceUid, modelPath, accuracy, epochs, loss). 
            // The new call signature in SvmService seems to be (deviceUid, modelPath, samplesCount, batchesCount, threshold, history, finalLoss).
            // We need to map these correctly or update the table schema to match SvmService's data.
            // For now, mapping: epochs -> batchesCount, loss -> finalLoss. 
            // Schema has: accuracy, epochs, loss.
            
            const values = [deviceUid, modelPath, batchesCount, finalLoss];
            const result = await pool.query(query, values);
            
            console.log(`💾 Modelo guardado en BD para ${deviceUid}`);
            return result.rows[0];

        } catch (error) {
            console.error("❌ Error guardando modelo en BD:", error.message);
            throw error;
        }
    },

    /**
     * Obtiene el modelo activo para un dispositivo
     */
    async getActiveModel(deviceUid) {
        const pool = await dbConnection();
        try {
            const result = await pool.query(
                'SELECT * FROM modelo_entrenado WHERE device_uid = $1 AND is_active = TRUE ORDER BY trained_at DESC LIMIT 1',
                [deviceUid]
            );
            return result.rows[0];
        } catch (error) {
            console.error("❌ Error obteniendo modelo activo:", error.message);
            return null;
        }
    },

    /**
     * Obtiene el historial de modelos para un dispositivo
     */
    async getModelHistory(deviceUid) {
        const pool = await dbConnection();
        try {
            const result = await pool.query(
                'SELECT * FROM modelo_entrenado WHERE device_uid = $1 ORDER BY trained_at DESC',
                [deviceUid]
            );
            return result.rows;
        } catch (error) {
            console.error("❌ Error obteniendo historial de modelos:", error.message);
            return [];
        }
    },

    /**
     * Activa un modelo específico y desactiva los demás
     */
    async setActiveModel(modelId) {
        const pool = await dbConnection();
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // Obtener device_uid del modelo
            const modelRes = await client.query(
                'SELECT device_uid FROM modelo_entrenado WHERE id = $1',
                [modelId]
            );

            if (modelRes.rows.length === 0) {
                throw new Error("Modelo no encontrado");
            }

            const deviceUid = modelRes.rows[0].device_uid;

            // Desactivar todos los de ese dispositivo
            await client.query(
                'UPDATE modelo_entrenado SET is_active = FALSE WHERE device_uid = $1',
                [deviceUid]
            );

            // Activar el seleccionado
            const updateRes = await client.query(
                'UPDATE modelo_entrenado SET is_active = TRUE WHERE id = $1 RETURNING *',
                [modelId]
            );

            await client.query('COMMIT');
            return updateRes.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            console.error("❌ Error activando modelo:", error.message);
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Obtiene un modelo por ID
     */
    async getById(modelId) {
        const pool = await dbConnection();
        try {
            const result = await pool.query('SELECT * FROM modelo_entrenado WHERE id = $1', [modelId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error("❌ Error obteniendo modelo por ID:", error);
            return null;
        }
    },

    /**
     * Elimina un modelo
     */
    async delete(modelId) {
        const pool = await dbConnection();
        try {
            await pool.query('DELETE FROM modelo_entrenado WHERE id = $1', [modelId]);
            console.log(`🗑️ Modelo ${modelId} eliminado de la BD`);
            return true;
        } catch (error) {
            console.error("❌ Error eliminando modelo:", error);
            throw error;
        }
    }
};

module.exports = ModeloEntrenado;
