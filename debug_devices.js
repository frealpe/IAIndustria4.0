const { dbConnection } = require('./Servidor/database/config');

async function checkDevices() {
    const pool = await dbConnection();
    try {
        console.log("Checking Devices table...");
        const res = await pool.query('SELECT * FROM Devices');
        console.log(`Found ${res.rows.length} devices.`);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error("Error checking devices:", err);
    } finally {
        await pool.end();
    }
}

checkDevices();
