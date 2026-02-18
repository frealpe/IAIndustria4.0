const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT, 10) || 5432,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DBNAME,
  ssl: { rejectUnauthorized: false },
  max: 50, // Aumentamos el pool para alta frecuencia
});

pool.connect()
  .then(client => {
    console.log('📦 Base de datos PostgreSQL en línea');
    client.release();
  })
  .catch(err => {
    console.error('❌ Error de conexión a la BD:', err);
  });

// Exportamos el pool, no lo redeclaramos en otro lado
module.exports = { dbConnection: () => pool };
