const mcpService = require('./services/McpService');
const { dbConnection } = require('./database/config');
require('dotenv').config();

// Mock socket service dependencies
const socketService = require('./services/SocketService');
socketService.emit = (event, data) => { }; // Silent emit

async function verifyChartGeneration() {
    try {
        console.log("🚀 [Test] Verifying 'Anomalies by Device' Chart Generation...");
        
        // 1. Simulate Agent's Tool Call
        const toolName = 'analizar_datos_avanzado';
        const tool = mcpService.getRawTools().find(t => t.name === toolName);
        
        if (!tool) throw new Error(`Tool '${toolName}' not found in McpService.`);

        const sql = "SELECT device_uid, COUNT(*) as anomaly_count FROM datos WHERE (resultado->>'isAnomaly')::boolean = true GROUP BY device_uid";
        
        console.log(`\n1️⃣  Running Tool: ${toolName}`);
        console.log(`    SQL: ${sql}`);
        
        // No Danfo code needed for simple aggregation, but let's test the "clean output" path
        const result = await tool.func({ sql });
        
        console.log(`\n2️⃣  Tool Output (Raw JSON expected):`);
        console.log(result.content[0].text);

        // 2. Validate Output Format
        let data;
        try {
            data = JSON.parse(result.content[0].text);
            if (!Array.isArray(data)) throw new Error("Output is not an array");
        } catch (e) {
             throw new Error("Tool output is NOT valid JSON: " + e.message);
        }

        console.log(`    ✅ Data is valid JSON Array with ${data.length} items.`);

        // 3. Simulate Agent's Vega-Lite Generation
        console.log(`\n3️⃣  Constructing Expected Vega-Lite JSON...`);
        
        const vegaLiteSpec = {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "data": { "values": data },
            "mark": "bar",
            "encoding": {
                "x": { "field": "device_uid", "type": "nominal", "title": "Dispositivo" },
                "y": { "field": "anomaly_count", "type": "quantitative", "title": "Anomalías" }
            }
        };

        console.log("\n----------------EXPECTED AGENT RESPONSE----------------");
        console.log("Aquí tienes el gráfico solicitado:");
        console.log("```json");
        console.log(JSON.stringify(vegaLiteSpec, null, 2));
        console.log("```");
        console.log("-------------------------------------------------------");
        
        console.log("\n✅ TEST PASSED: System produces valid data for chart generation.");

    } catch (error) {
        console.error("\n❌ TEST FAILED:", error.message);
        if (error.stack) console.error(error.stack);
    } finally {
        setTimeout(() => process.exit(0), 500);
    }
}

verifyChartGeneration();
