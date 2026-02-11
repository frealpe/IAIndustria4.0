/**
 * Script to test anomalies query
 */
const { dbConnection } = require('./Servidor/database/config');

async function testAnomalias() {
    const pool = await dbConnection();
    
    try {
        console.log("=== TEST 1: Total records in Esp32_Log ===");
        const total = await pool.query('SELECT COUNT(*) FROM Esp32_Log');
        console.log('Total records:', total.rows[0].count);
        
        console.log("\n=== TEST 2: Records with resultado field ===");
        const withResultado = await pool.query('SELECT COUNT(*) FROM Esp32_Log WHERE resultado IS NOT NULL');
        console.log('Records with resultado:', withResultado.rows[0].count);
        
        console.log("\n=== TEST 3: Sample resultado structure ===");
        const sample = await pool.query("SELECT device_uid, resultado, created_at FROM Esp32_Log WHERE resultado IS NOT NULL ORDER BY created_at DESC LIMIT 5");
        console.log('Sample records:');
        sample.rows.forEach((row, idx) => {
            console.log(`\n${idx + 1}. Device: ${row.device_uid}`);
            console.log(`   Created: ${row.created_at}`);
            console.log(`   Resultado:`, JSON.stringify(row.resultado, null, 2));
        });

        console.log("\n=== TEST 4: Records with isAnomaly = true ===");
        const anomalias = await pool.query(`
            SELECT device_uid, resultado, created_at 
            FROM Esp32_Log 
            WHERE (resultado->>'isAnomaly')::boolean IS TRUE 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        console.log(`Found ${anomalias.rows.length} anomalies`);
        anomalias.rows.forEach((row, idx) => {
            console.log(`\n${idx + 1}. Device: ${row.device_uid}`);
            console.log(`   Created: ${row.created_at}`);
            console.log(`   isAnomaly:`, row.resultado.isAnomaly);
            console.log(`   loss:`, row.resultado.loss);
        });

        console.log("\n=== TEST 5: Records with isAnomaly = false ===");
        const normals = await pool.query(`
            SELECT COUNT(*) 
            FROM Esp32_Log 
            WHERE (resultado->>'isAnomaly')::boolean IS FALSE
        `);
        console.log(`Normal records: ${normals.rows[0].count}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

testAnomalias();
