const { dbConnection } = require("./database/config");

async function checkDb() {
    const pool = dbConnection();
    try {
        const recent = await pool.query("SELECT * FROM datos ORDER BY created_at DESC LIMIT 1");
        if (recent.rows.length > 0) {
            console.log("Row Keys:", Object.keys(recent.rows[0]));
            console.log("Full Row:", recent.rows[0]);
        } else {
            console.log("No data found.");
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit();
    }
}

checkDb();
