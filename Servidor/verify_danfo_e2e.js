const { executeDanfoCode } = require('./helpers/analysisHelper');
const dfd = require("danfojs-node");

// Simulación de datos extraídos por SQL
const mockData3 = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    resultado: JSON.stringify({
        rawValues: Array.from({ length: 5 }, () => 3.5 + Math.random())
    })
}));

console.log(`🔌 [TEST] Datos Simulados: ${mockData3.length} filas.`);

// Código Danfo.js similar al del agente pero usando el NUEVO helper seguro
const agentCodeFixed = `
    const rawValues = helpers.flattenColumn(df, 'resultado', 'rawValues');
    
    // Casteo
    const voltages = helpers.castSeriesToFloat(rawValues);
    
    // NUEVO: Usar helpers.toDataFrame en lugar de new dfd.DataFrame
    const dfVoltages = helpers.toDataFrame(voltages, ['voltaje']);

    return {
        count: dfVoltages.count(),
        head: dfd.toJSON(dfVoltages.head(3))
    };
`;

console.log("🤖 [TEST] Ejecutando código CORREGIDO...");

try {
    const result = executeDanfoCode(mockData3, agentCodeFixed);
    
    console.log("✅ [TEST] Resultado RAW:");
    console.log(result.output);

    if (!result.stats._error && result.output.includes("count")) {
        console.log("🎉 VERIFICACIÓN EXITOSA: helpers.toDataFrame funcionó correctamente.");
    } else {
        console.error("❌ ERROR PERSISTE:", result.stats.message);
    }

} catch (err) {
    console.error("❌ ERROR CRÍTICO:", err.message);
}
