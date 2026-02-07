const { dbConnection } = require('../database/config');

const Esp32Model = {
  // Crear tabla para logs históricos
  initTable: async () => {
    const pool = dbConnection();
    // Nota: Si la tabla ya existe con UNIQUE, puede requerir intervención manual o DROP TABLE.
    // Aquí definimos la estructura para logs históricos.
    const query = `
      CREATE TABLE IF NOT EXISTS Esp32_Log (
        id SERIAL PRIMARY KEY,
        device_uid TEXT NOT NULL, 
        resultado JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    
    try {
      const client = await pool.connect();
      await client.query(query);
      client.release();
      console.log("✅ Tabla 'Esp32_Log' (Histórico) verificada/creada");
    } catch (err) {
      console.error("❌ Error creando tabla Esp32_Log:", err);
    }
  },

  // Guardar nuevo registro histórico (INSERT simple)
  create: async (deviceUid, resultado, mean = 0) => {
    const pool = dbConnection();
    const query = `
      INSERT INTO Esp32_Log (device_uid, resultado, mean, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *;
    `;
    
    try {
      const client = await pool.connect();
      const res = await client.query(query, [deviceUid, resultado, mean]);
      client.release();
      // console.log("💾 Log guardado en BD:", res.rows[0].id);
      return res.rows[0];
    } catch (err) {
      console.error("❌ Error guardando histórico en Esp32_Log:", err);
      // Fallback si falla por columna faltante (para desarrollo)
      if (err.code === '42703') { // undefined_column
          console.warn("⚠️ Intentando crear columna 'mean' y reintentar...");
          await Esp32Model.addColumnMean();
          return Esp32Model.create(deviceUid, resultado, mean); // Retry
      }
      return null;
    }
  },

  addColumnMean: async () => {
      const pool = dbConnection();
      try {
          const client = await pool.connect();
          await client.query("ALTER TABLE Esp32_Log ADD COLUMN IF NOT EXISTS mean NUMERIC DEFAULT 0;");
          client.release();
          console.log("✅ Columna 'mean' agregada/verificada.");
      } catch (e) {
          console.error("Error agregando columna mean:", e);
      }
  }
};

// Inicializar tabla al cargar modelo
Esp32Model.initTable().then(() => Esp32Model.addColumnMean());

module.exports = Esp32Model;
