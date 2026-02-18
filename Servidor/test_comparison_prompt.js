const MultiAgentService = require("./services/MultiAgentService");

async function testComparisonFlow() {
    const query = "Compara el comportamiento del voltaje entre los registros de esta mañana y los de hace una hora. Estadísticamente, ¿cuál periodo fue más estable? Genera una gráfica comparativa";
    console.log(`🚀 Testing comparison flow with query: "${query}"`);
    
    try {
        const result = await MultiAgentService.processQuery(query);
        console.log("\n--- AGENT RESPONSE ---");
        console.log(result.text);
        
        console.log("\n--- EXTRACTED DATA ---");
        console.log("Data length:", result.data ? result.data.length : 0);
        
        console.log("\n--- EXTRACTED VISUALIZATION ---");
        if (result.visualization) {
            console.log("✅ Visualization spec found (Vega-Lite)");
            console.log("Title:", result.visualization.title || "No title");
            console.log("Mark:", result.visualization.mark);
        } else {
            console.warn("⚠️ No visualization extracted!");
        }
    } catch (err) {
        console.error("❌ Test Failed:", err);
    }
}

testComparisonFlow();
