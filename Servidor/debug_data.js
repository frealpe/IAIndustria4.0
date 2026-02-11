const { dbConnection } = require('./database/config');
const { Pool } = require('pg');

async function debugData() {
    const pool = dbConnection();
    try {
        console.log("🔍 Inspecting Esp32_Log data for 'planta1'...");
        
        // 1. Get device_uid for planta1
        const deviceRes = await pool.query("SELECT device_uid FROM Devices WHERE name = 'planta1'");
        if (deviceRes.rows.length === 0) {
            console.log("❌ Device 'planta1' not found.");
            return;
        }
        const uid = deviceRes.rows[0].device_uid;
        console.log(`✅ Device UID: ${uid}`);

        // 2. Get last 20 logs
        const logsRes = await pool.query(`SELECT resultado FROM datos WHERE device_uid = $1 ORDER BY id DESC LIMIT 20`, [uid]);
        
        console.log(`🔍 Found ${logsRes.rows.length} logs.`);
        
        logsRes.rows.forEach((row, i) => {
            let res = row.resultado;
            if (typeof res === 'string') {
                console.log(`[Log ${i}] resultado is STRING. Parsing...`);
                try { res = JSON.parse(res); } catch(e) { console.log("Parse error"); }
            }
            
            // Check content
            if (Array.isArray(res)) {
                 res.forEach((item, j) => {
                     if (item.isAnomaly || item.isAnomaly === 'true' || item.isAnomaly === 'false' || item.isAnomaly === false) {
                         console.log(`  [Row ${i} Item ${j}] isAnomaly type: ${typeof item.isAnomaly}, value: ${item.isAnomaly}`);
                     }
                 });
            } else if (typeof res === 'object') {
                 console.log(`  [Row ${i}] Object. isAnomaly: ${res.isAnomaly} (${typeof res.isAnomaly})`);
            }
        });

    } catch (err) {
        console.error("Error:", err);
    } finally {
        // We can't easily close the singleton pool, but script will exit
        process.exit(0);
    }
}

debugData();
