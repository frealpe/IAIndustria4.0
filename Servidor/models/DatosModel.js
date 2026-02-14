const { dbConnection } = require('../database/config');
const DeviceModel = require('./DeviceModel');

const DatosModel = {
  // Crear tabla para logs históricos
  init: async () => {
    const pool = dbConnection();
    // Nota: Si la tabla ya existe con UNIQUE, puede requerir intervención manual o DROP TABLE.
    // Aquí definimos la estructura para logs históricos.
    const query = `
      CREATE TABLE IF NOT EXISTS datos (
        id SERIAL PRIMARY KEY,
        device_uid TEXT NOT NULL, 
        device_id INTEGER REFERENCES Devices(id) ON DELETE SET NULL,
        resultado JSONB NOT NULL,
        mean NUMERIC DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    try {
      const client = await pool.connect();
      await client.query(query);
      client.release();
      console.log("✅ Tabla 'datos' (Histórico) verificada/creada");
      
      // Auto-sync schema after creation
      await DatosModel.syncSchema();
      
    } catch (err) {
      console.error("❌ Error creando tabla datos:", err);
    }
  },

  // Sincronizar esquema (agregar columnas faltantes)
  syncSchema: async () => {
      const pool = dbConnection();
      try {
          const client = await pool.connect();
          
          // 1. Agregar columna mean si no existe
          await client.query("ALTER TABLE datos ADD COLUMN IF NOT EXISTS mean NUMERIC DEFAULT 0;");
          
          // 2. Agregar columna device_id si no existe
          await client.query("ALTER TABLE datos ADD COLUMN IF NOT EXISTS device_id INTEGER;");

          // 3. Crear índice para device_uid
          await client.query("CREATE INDEX IF NOT EXISTS idx_datos_device_uid ON datos(device_uid);");

          // 4. Crear índice para created_at (BÚSQUEDAS RECIENTES)
          await client.query("CREATE INDEX IF NOT EXISTS idx_datos_created_at ON datos(created_at DESC);");

          // 5. Crear índice funcional para anomalías (JSONB)
          await client.query("CREATE INDEX IF NOT EXISTS idx_datos_anomalias ON datos (((resultado->>'isAnomaly')::boolean)) WHERE ((resultado->>'isAnomaly')::boolean IS TRUE);");

          // 4. Agregar FK si no existe (verificación simple)
          // Nota: Esto puede fallar si existen datos huérfanos, pero es un intento best-effort
          try {
             const fkCheck = await client.query("SELECT 1 FROM pg_constraint WHERE conname = 'fk_datos_device'");
             if (fkCheck.rowCount === 0) {
                 // Intentar agregar FK. Si falla (por datos huérfanos), lo logueamos pero no detenemos
                 await client.query(`
                    ALTER TABLE datos 
                    ADD CONSTRAINT fk_datos_device 
                    FOREIGN KEY (device_id) 
                    REFERENCES Devices(id) 
                    ON DELETE SET NULL;
                 `);
                 console.log("✅ Foreign Key 'fk_datos_device' agregada.");
             }
          } catch (fkError) {
              console.warn("⚠️ No se pudo agregar FK (posibles datos huérfanos o ya existe):", fkError.message);
          }

          client.release();
          console.log("✅ Esquema de 'datos' sincronizado.");
      } catch (e) {
          console.error("❌ Error sincronizando esquema datos:", e);
      }
  },

  // Guardar nuevo registro histórico (INSERT simple)
  create: async (deviceUid, resultado, mean = 0, deviceIdOverride = null) => {
    const pool = dbConnection();
    
    // Buscar device_id asociado (solo si no se provee)
    let deviceId = deviceIdOverride;
    if (!deviceId) {
        try {
            const device = await DeviceModel.getByUid(deviceUid);
            if (device) {
                deviceId = device.id;
            }
        } catch (err) {
            console.warn("⚠️ No se pudo obtener device_id para el log:", err.message);
        }
    }

    const query = `
      INSERT INTO public.datos (device_uid, device_id, resultado, mean, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
    `;
    
    try {
      // Usar pool.query directamente (gestiona connect/release automáticamente)
      const res = await pool.query(query, [deviceUid, deviceId, resultado, mean]);
      return res.rows[0];
    } catch (err) {
      console.error("❌ Error guardando histórico en datos:", err);
      // Fallback: Si falla, intentar sincronizar y reintentar una vez
      if (err.code === '42703') { // undefined_column
          console.warn("⚠️ Columnas faltantes detectadas. Sincronizando esquema...");
          await DatosModel.syncSchema();
          return DatosModel.create(deviceUid, resultado, mean); // Retry recursion
      }
      return null;
    }
  }
};



module.exports = DatosModel;
