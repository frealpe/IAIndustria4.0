const MultiAgentService = require("./services/MultiAgentService");

async function testArchitecturePipeline() {
    const query = "Analiza el voltaje de la Planta1 durante las últimas 24 horas. Busca anomalías y genera una visualización de tendencias con detecciones.";
    console.log(`🚀 Testing New 6-Stage Architecture with query: "${query}"`);
    
    try {
        const start = Date.now();
        const result = await MultiAgentService.processQuery(query);
        const duration = Date.now() - start;

        console.log("\n--- PIPELINE EXECUTION REPORT ---");
        console.log(`⏱️ Duration: ${duration}ms`);
        console.log("\n--- AGENT RESPONSE ---");
        console.log(result.text);
        
        console.log("\n--- DATA PAYLOAD ---");
        console.log("Rows:", result.data ? result.data.length : 0);
        console.log("Sample:", result.data ? result.data.slice(0, 1) : "None");
        
        console.log("\n--- VISUALIZATION SPEC ---");
        if (result.visualization) {
            console.log("✅ Vega-Lite Spec Present");
            console.log("Mark:", result.visualization.mark);
            console.log("Data size in spec:", result.visualization.data?.values?.length);
        } else {
            console.warn("⚠️ No detailed visualization spec found!");
        }

    } catch (err) {
        console.error("❌ Pipeline Failed:", err);
    }
}

testArchitecturePipeline();
