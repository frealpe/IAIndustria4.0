require('dotenv').config({ path: '/home/fabio/Escritorio/IA/MCP/Servidor/.env' });
const { Client } = require('pg');

const client = new Client({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT, 10) || 5432,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DBNAME,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  await client.connect();
  const res = await client.query("SELECT to_regclass('public.datos');");
  console.log("Table 'public.datos' exists:", res.rows[0].to_regclass);
  
  if (res.rows[0].to_regclass) {
      const count = await client.query("SELECT COUNT(*) FROM datos");
      console.log("Row count:", count.rows[0].count);
  }
  await client.end();
}

check().catch(console.error);
