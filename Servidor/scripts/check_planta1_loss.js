const { dbConnection } = require('../database/config');
(async ()=>{
  try {
    const pool = await dbConnection();
    const q1 = `SELECT count(*) as total FROM datos d JOIN devices dev ON d.device_uid = dev.device_uid WHERE dev.name ILIKE '%planta%1%'`;
    const r1 = await pool.query(q1);
    console.log('Total filas para dev.name ILIKE "%planta%1%":', r1.rows[0].total);

    const q2 = `SELECT count(*) as total FROM datos d JOIN devices dev ON d.device_uid = dev.device_uid WHERE dev.name ILIKE '%planta%1%' AND (d.resultado->>'loss') IS NOT NULL`;
    const r2 = await pool.query(q2);
    console.log('Total filas con resultado->>"loss" no nulo:', r2.rows[0].total);

    const q3 = `SELECT (d.resultado->>'loss') as loss, d.created_at FROM datos d JOIN devices dev ON d.device_uid = dev.device_uid WHERE dev.name ILIKE '%planta%1%' ORDER BY d.created_at DESC LIMIT 5`;
    const r3 = await pool.query(q3);
    console.log('Ejemplos (últimos 5):');
    console.table(r3.rows);

    await pool.end();
  } catch (e) {
    console.error('Error comprobando BD:', e.message);
    process.exit(1);
  }
})();
