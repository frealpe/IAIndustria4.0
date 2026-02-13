const MultiAgentService = require('./services/MultiAgentService');
const { dbConnection } = require('./database/config');

async function testAnalysis() {
    console.log("🚀 Testing Analysis for 'Planta1'...");
    
    // Mock request
    const mockReq = {
        body: {
            query: "Genera un reporte de analisis de Planta1. Cuantas anomalias tiene?",
            socketId: "test-socket"
        },
        io: { to: () => ({ emit: () => {} }) } // Mock IO
    };

    try {
        const result = await MultiAgentService.processQuery(mockReq.body.query, mockReq.io, mockReq.body.socketId, []);
        console.log("\n✅ Final Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        // Close DB pool to exit script
        // dbConnection().end(); // Note: dbConnection returns a pool, usually singleton. 
        // We might need to handle closure depending on implementation.
        process.exit(0);
    }
}

testAnalysis();
