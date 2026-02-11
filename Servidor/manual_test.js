
const mcpService = require('./services/McpService');

async function manualTest() {
    console.log("--- 🧪 Prueba Manual de Generación de Código ---");
    
    // 1. Obtenemos la herramienta
    const tools = mcpService.getRawTools();
    const analyzeTool = tools.find(t => t.name === 'analizar_datos_avanzado');

    if (!analyzeTool) {
        console.error("❌ Error: No se encontró la herramienta.");
        return;
    }

    // 2. Definimos un código de prueba (Simulando lo que haría el agente)
    // Calcula el cuadrado de un número y devuelve las columnas del DataFrame
    const codigoDePrueba = `
        function calcularCuadrado(x) {
            return x * x;
        }

        const columnas = df.columns;
        const valorCalculado = calcularCuadrado(10); // 10 * 10 = 100

        return {
            mensaje: "Hola desde Danfo.js dinámico",
            columnas_detectadas: columns,
            calculo_test: valorCalculado
        };
    `;

    console.log("📝 Ejecutando código dinámico...");
    
    try {
        const result = await analyzeTool.func({ 
            tabla: 'datos', 
            limite: 1, // Solo necesitamos 1 registro para tener estructura
            codigo: codigoDePrueba
        });

        console.log("\n✅ Resultado del Agente:");
        console.log(result.content[0].text);

    } catch (e) {
        console.error("❌ Falló la prueba:", e.message);
    }

    process.exit(0);
}

manualTest();
