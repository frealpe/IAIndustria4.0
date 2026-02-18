const { getChatModel } = require("./services/agentes/modelFactory");
const { HumanMessage } = require("@langchain/core/messages");

async function testAI() {
    try {
        console.log("🧪 Testing AI connectivity...");
        const model = getChatModel({ temperature: 0 });
        const res = await model.invoke([new HumanMessage("Responde solo con la palabra 'OK' si recibes esto.")]);
        console.log("✅ AI Response:", res.content);
    } catch (err) {
        console.error("❌ AI Test Failed:", err.message);
    }
}

testAI();
