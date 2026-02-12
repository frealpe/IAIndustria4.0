const service = require('./services/MultiAgentService');

async function test() {
    console.log("Testing SQL Agent with llama3.1...");
    try {
        const result = await service.processQuery("dame los últimos 5 logs");
        console.log("Result:", result);
    } catch (error) {
        console.error("Test failed:", error);
    }
}

test();
