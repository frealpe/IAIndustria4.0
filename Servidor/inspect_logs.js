
const { dbConnection } = require('./database/config');

async function inspect() {
    const pool = dbConnection();
    try {
        const res = await pool.query('SELECT device_uid, resultado FROM Esp32_Log ORDER BY created_at DESC LIMIT 5');
        console.log("Found logs:", res.rows.length);
        res.rows.forEach((row, i) => {
            console.log(`Log #${i} [${row.device_uid}]:`, JSON.stringify(row.resultado, null, 2));
        });
    } catch (err) {
        console.error("Error inspecting:", err);
    } finally {
        pool.end(); 
    }
}

inspect();
