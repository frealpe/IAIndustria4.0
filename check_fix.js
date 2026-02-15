const { executeDanfoCode } = require('./Servidor/helpers/analysisHelper');
const dfd = require("danfojs-node");

// Mock data
const data = [{ loss: 1 }, { loss: 2 }, { loss: 3 }];

// Code that uses arraySync
const code = `
    const s = df['loss'];
    if (typeof s.arraySync === 'function') {
        return s.arraySync();
    } else {
        return "arraySync not found";
    }
`;

try {
    const result = executeDanfoCode(data, code);
    console.log("Result:", result);
    if (Array.isArray(result.stats.raw)) {
        console.log("Verification SUCCESS: arraySync returned an array.");
    } else {
        console.log("Verification FAILED: Result is not an array:", result);
    }
} catch (error) {
    console.error("Verification FAILED with error:", error);
}
