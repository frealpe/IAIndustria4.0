const MultiAgentService = require("./services/MultiAgentService");

async function testFullFlow() {
    const query = "Crea un gráfico de barras que compare cuántas anomalías se han detectado en los registros más recientes frente a los registros normales. Usa el campo isAnomaly que está dentro del JSON resultado.";
    console.log(`🚀 Testing full flow with query: "${query}"`);
    
    try {
        const result = await MultiAgentService.processQuery(query);
        console.log("✅ Result Text:", result.text);
        console.log("✅ Result Data:", JSON.stringify(result.data, null, 2));
    } catch (err) {
        console.error("❌ Test Failed:", err);
    }
}

testFullFlow();
