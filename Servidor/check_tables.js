const { dbConnection } = require('./database/config');

async function checkTables() {
    const pool = dbConnection();
    // Wait for connection
    await new Promise(r => setTimeout(r, 1000));

    try {
        console.log("🔍 Listing tables in current DB...");
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        console.table(res.rows);

        // Check for specific tables
        const logTable = res.rows.find(r => r.table_name.toLowerCase() === 'esp32_log');
        const trainedTable = res.rows.find(r => r.table_name.toLowerCase() === 'esp32_trained_models');
        
        console.log("--- Check Results ---");
        console.log("Esp32_Log exists?", !!logTable, logTable ? `(Name: ${logTable.table_name})` : '');
        console.log("Esp32_Trained_Models exists?", !!trainedTable, trainedTable ? `(Name: ${trainedTable.table_name})` : '');

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit(0);
    }
}

checkTables();
