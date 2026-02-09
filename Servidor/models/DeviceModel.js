const { dbConnection } = require('../database/config');

/**
 * Model for managing ESP32 devices
 */
class DeviceModel {
    /**
     * Initialize the Devices table
     */
    static async init() {
        const pool = await dbConnection();
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS Devices (
                id SERIAL PRIMARY KEY,
                device_uid VARCHAR(50) UNIQUE NOT NULL,
                mac_address VARCHAR(17) UNIQUE NOT NULL,
                name VARCHAR(100),
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `;
        
        try {
            await pool.query(createTableQuery);
            console.log("✅ Tabla 'Devices' verificada/creada");
        } catch (error) {
            console.error("❌ Error creando tabla Devices:", error);
            throw error;
        }
    }

    /**
     * Get all devices
     */
    static async getAll() {
        const pool = await dbConnection();
        try {
            const result = await pool.query(
                'SELECT * FROM Devices ORDER BY created_at DESC'
            );
            return result.rows;
        } catch (error) {
            console.error("❌ Error obteniendo dispositivos:", error);
            throw error;
        }
    }

    /**
     * Get device by UID
     */
    static async getByUid(device_uid) {
        const pool = await dbConnection();
        try {
            const result = await pool.query(
                'SELECT * FROM Devices WHERE device_uid = $1',
                [device_uid]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error("❌ Error obteniendo dispositivo:", error);
            throw error;
        }
    }

    /**
     * Get device by ID
     */
    static async getById(id) {
        const pool = await dbConnection();
        try {
            const result = await pool.query(
                'SELECT * FROM Devices WHERE id = $1',
                [id]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error("❌ Error obteniendo dispositivo:", error);
            throw error;
        }
    }

    /**
     * Create new device
     */
    static async create(device_uid, mac_address, name = null, description = null) {
        const pool = await dbConnection();
        try {
            const result = await pool.query(
                `INSERT INTO Devices (device_uid, mac_address, name, description) 
                VALUES ($1, $2, $3, $4) 
                RETURNING *`,
                [device_uid, mac_address, name, description]
            );
            console.log(`✅ Dispositivo registrado: ${device_uid} (MAC: ${mac_address})`);
            return result.rows[0];
        } catch (error) {
            console.error("❌ Error creando dispositivo:", error);
            throw error;
        }
    }

    /**
     * Update device
     */
    static async update(id, data) {
        const pool = await dbConnection();
        const { device_uid, mac_address, name, description, is_active } = data;
        
        try {
            const result = await pool.query(
                `UPDATE Devices 
                SET device_uid = COALESCE($1, device_uid),
                    mac_address = COALESCE($2, mac_address),
                    name = COALESCE($3, name),
                    description = COALESCE($4, description),
                    is_active = COALESCE($5, is_active),
                    updated_at = NOW()
                WHERE id = $6
                RETURNING *`,
                [device_uid, mac_address, name, description, is_active, id]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Dispositivo no encontrado');
            }
            
            console.log(`✅ Dispositivo actualizado: ID ${id}`);
            return result.rows[0];
        } catch (error) {
            console.error("❌ Error actualizando dispositivo:", error);
            throw error;
        }
    }

    /**
     * Delete device
     */
    static async delete(id) {
        const pool = await dbConnection();
        try {
            const result = await pool.query(
                'DELETE FROM Devices WHERE id = $1 RETURNING *',
                [id]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Dispositivo no encontrado');
            }
            
            console.log(`✅ Dispositivo eliminado: ID ${id}`);
            return result.rows[0];
        } catch (error) {
            console.error("❌ Error eliminando dispositivo:", error);
            throw error;
        }
    }

    /**
     * Set device active status
     */
    static async setActive(id, is_active) {
        const pool = await dbConnection();
        try {
            const result = await pool.query(
                `UPDATE Devices 
                SET is_active = $1, updated_at = NOW() 
                WHERE id = $2 
                RETURNING *`,
                [is_active, id]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Dispositivo no encontrado');
            }
            
            console.log(`✅ Estado de dispositivo actualizado: ID ${id} -> ${is_active ? 'Activo' : 'Inactivo'}`);
            return result.rows[0];
        } catch (error) {
            console.error("❌ Error actualizando estado:", error);
            throw error;
        }
    }
}

module.exports = DeviceModel;
