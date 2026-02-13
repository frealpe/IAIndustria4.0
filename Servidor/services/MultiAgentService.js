const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { StateGraph, Annotation, START, END } = require("@langchain/langgraph");
const mcpService = require("./McpService");
const { tool } = require("@langchain/core/tools");
const { getChatModel, getLocalModel } = require("./agentes/modelFactory");
const { DB_SCHEMA } = require("../constants/schema");
const { z } = require("zod");
const { AgentResponseSchema } = require("../schemas/agentResponseSchema");

const model = getChatModel({ temperature: 0 });
const modelLocal = getLocalModel();
const rawTools = mcpService.getRawTools();

const getToolsByName = (names) => {
    return rawTools.filter(t => names.includes(t.name)).map(t => tool(t.func, { name: t.name, description: t.description, schema: t.schema }));
};

const sqlAgent = createReactAgent({
    llm: model,
    tools: getToolsByName(['query_db', 'leer_archivos_proyecto']),
    stateModifier: new SystemMessage("Eres un Senior DBA. Generas SQL SELECT precisos. Esquema: " + DB_SCHEMA)
});

const analysisAgent = createReactAgent({
    llm: model,
    tools: getToolsByName(['analizar_datos_avanzado', 'leer_archivos_proyecto', 'query_db']),
    stateModifier: new SystemMessage(
        "Eres un Científico de Datos Experto. Tu capacidad especial es PROGRAMAR análisis en tiempo real Y GENERAR VISUALIZACIONES DINÁMICAS.\n\n" +
        "ESQUEMA DISPONIBLE:\n" + DB_SCHEMA + "\n\n" +
        "REGLAS CRÍTICAS DE SQL:\n" +
        "1. NOMBRES DE DISPOSITIVOS: Siempre usa `ILIKE '%nombre%'` con comodines. Ejemplo: Si el usuario dice 'Planta 1', usa `dev.name ILIKE '%plant%1%'`.\n" +
        "2. PREFIJOS OBLIGATORIOS: Usa siempre `d.created_at`, `d.id`, `d.device_uid` para evitar errores de ambigüedad con la tabla `devices`.\n" +
        "3. NO ALUCINES: Si las herramientas devuelven 'Sin datos', informa al usuario. NUNCA inventes resultados.\n\n" +
        "LIBRERÍAS EN 'codigo':\n" +
        "- 'df': DataFrame de Danfo.js.\n" +
        "- 'helpers.regressionStats(df['col'])': Devuelve {slope, r2}.\n\n" +
        "PROCESAMIENTO DE DATOS PARA GRÁFICAS:\n" +
        "IMPORTANTE: Danfo.js NO tiene método .map(). Para procesar datos:\n" +
        "1. Convierte el DataFrame a JSON: const rows = dfd.toJSON(df);\n" +
        "2. Procesa con JavaScript estándar: rows.map(row => ({ ... }))\n" +
        "3. Retorna el array para usar en Vega-Lite spec\n" +
        "Ejemplo CORRECTO:\n" +
        "const data = dfd.toJSON(df).map(row => ({\n" +
        "  created_at: row.created_at,\n" +
        "  loss: parseFloat(row.resultado?.loss || row.loss),\n" +
        "  threshold: 0.05\n" +
        "}));\n" +
        "return data;\n\n" +
        "VISUALIZACIONES VEGA-LITE:\n" +
        "Puedes generar gráficas usando Vega-Lite. Tipos disponibles:\n" +
        "- 'line': Series temporales (voltaje en el tiempo)\n" +
        "- 'bar': Comparaciones (anomalías por dispositivo)\n" +
        "- 'point': Scatter plots (correlaciones)\n" +
        "- 'bar' + bin: Histogramas (distribuciones)\n" +
        "- 'boxplot': Estadísticas con cuartiles\n" +
        "- 'area': Áreas apiladas (composición)\n" +
        "Ejemplo de spec Vega-Lite para línea temporal:\n" +
        "{\n" +
        "  \"$schema\": \"https://vega.github.io/schema/vega-lite/v5.json\",\n" +
        "  \"mark\": {\"type\": \"line\", \"point\": true, \"tooltip\": true},\n" +
        "  \"encoding\": {\n" +
        "    \"x\": {\"field\": \"created_at\", \"type\": \"temporal\", \"title\": \"Tiempo\"},\n" +
        "    \"y\": {\"field\": \"voltage\", \"type\": \"quantitative\", \"title\": \"Voltaje (V)\"}\n" +
        "  },\n" +
        "  \"data\": {\"values\": [...datos reales aquí...]}\n" +
        "}\n" +
        "IMPORTANTE: Incluye SIEMPRE tooltip, usa 'container' para width, y limita datos a 500 puntos máximo.\n\n" +
        "--- RESPUESTA FINAL (JSON VALIDADO CON ZOD) ---\n" +
        "CRÍTICO: Tu respuesta será validada con este schema Zod:\n" +
        "{\n" +
        "  resumen: string (mínimo 10 caracteres),\n" +
        "  metrias: array de { label: string, value: string|number, status: 'ok'|'warning'|'info'|'critical' },\n" +
        "  charts: array de { title: string, spec: VegaLiteSpec (máximo 500 puntos de datos) },\n" +
        "  conclusion: string (opcional, mínimo 10 caracteres)\n" +
        "}\n" +
        "REQUISITOS ESTRICTOS:\n" +
        "1. 'status' en metrias SOLO puede ser: ok, warning, info, o critical\n" +
        "2. 'charts[].spec.data.values' debe tener MÁXIMO 500 elementos\n" +
        "3. 'charts[].spec' DEBE incluir: mark, encoding, y data\n" +
        "4. 'resumen' y 'conclusion' deben tener al menos 10 caracteres\n" +
        "5. Todos los campos 'title' deben ser descriptivos (no vacíos)\n\n" +
        "EJEMPLO VÁLIDO COMPLETO:\n" +
        "{\n" +
        "  \"resumen\": \"Análisis de voltaje completado para Planta 1 con 50 registros.\",\n" +
        "  \"metrias\": [\n" +
        "    {\"label\": \"Voltaje Promedio\", \"value\": \"3.28V\", \"status\": \"ok\"},\n" +
        "    {\"label\": \"Anomalías Detectadas\", \"value\": \"2\", \"status\": \"warning\"}\n" +
        "  ],\n" +
        "  \"charts\": [\n" +
        "    {\n" +
        "      \"title\": \"Voltaje en el Tiempo - Planta 1\",\n" +
        "      \"spec\": {\n" +
        "        \"$schema\": \"https://vega.github.io/schema/vega-lite/v5.json\",\n" +
        "        \"mark\": {\"type\": \"line\", \"point\": true, \"tooltip\": true},\n" +
        "        \"encoding\": {\n" +
        "          \"x\": {\"field\": \"created_at\", \"type\": \"temporal\", \"title\": \"Tiempo\"},\n" +
        "          \"y\": {\"field\": \"voltage\", \"type\": \"quantitative\", \"title\": \"Voltaje (V)\"}\n" +
        "        },\n" +
        "        \"data\": {\"values\": [...datos reales aquí, máximo 500...]}\n" +
        "      }\n" +
        "    }\n" +
        "  ],\n" +
        "  \"conclusion\": \"El sistema opera establemente con voltaje dentro del rango normal.\"\n" +
        "}\n" +
        "NOTA: El campo 'charts' es OPCIONAL. Solo inclúyelo cuando el análisis se beneficie de visualización."
    )
});

// --- GRAFO ---
const GraphState = Annotation.Root({ 
    input: Annotation(), 
    chat_history: Annotation({ reducer: (x, y) => x.concat(y), default: () => [] }), 
    user_intent: Annotation(), 
    agent_response: Annotation() 
});

const nodeOrchestrator = async (state) => {
    console.log("🕵️ [Orchestrator] Input:", state.input);
    const historyText = state.chat_history.map(m => `${m.role}: ${m.content}`).join("\n");
    
    const response = await model.invoke([
        new SystemMessage(
            "Eres el Orquestador. Tu única misión es clasificar la intención del usuario basándote en su mensaje actual Y el historial.\n" +
            "ROLES:\n" +
            "- DATA_SCIENTIST: Para CUALQUIER ANÁLISIS relacionado con datos de sensores, tendencias, regresión, anomalías (incluso contar cuántas hay), R2, predicciones, gráficas complejas O SEGUIMIENTO DE ANÁLISIS PREVIOS.\n" +
            "- SQL_EXPERT: SOLO para listados simples de inventario (qué dispositivos hay), búsquedas de texto exacto en descripciones o contar registros TOTALES de la tabla sin filtros complejos de JSON.\n" +
            "Responde solo JSON: {\"next\":\"...\"}"
        ),
        new HumanMessage(`HISTORIAL:\n${historyText}\n\nUSUARIO ACTUAL:\n${state.input}`)
    ]);
    console.log("🕵️ [Orchestrator] Response:", response.content);
    const decision = JSON.parse(response.content.replace(/```json/g, '').replace(/```/g, ''));
    return { user_intent: decision.next };
};

const nodeSqlExpert = async (state) => {
    console.log("🤖 [SQL Expert] Processing...");
    // Inject schema tips into system message if not already present
    const messages = [
        new SystemMessage("Eres un Senior DBA. Generas SQL SELECT precisos.\n" + 
            "ESQUEMA: " + DB_SCHEMA + "\n" +
            "REGLAS:\n" +
            "1. Para buscar dispositivos por nombre (ej: 'Planta 1'), SIEMPRE haz JOIN con `devices` y usa `dev.name ILIKE '%planta%1%'`.\n" +
            "2. No inventes tablas. Todo está en `datos` y `devices`.\n" +
            "3. Anomalías = `(resultado->>'isAnomaly')::boolean IS TRUE`."
        ),
        ...state.chat_history.map(m => m.role === 'user' ? new HumanMessage(m.content) : new SystemMessage(m.content)),
        new HumanMessage(state.input)
    ];
    const result = await sqlAgent.invoke({ messages });
    console.log("🤖 [SQL Expert] Result:", result.messages[result.messages.length - 1].content);
    return { agent_response: result.messages[result.messages.length - 1].content };
};

const nodeDataScientist = async (state) => {
    console.log("📊 [Data Scientist] Processing...");
    console.log("📊 [Data Scientist] State Input:", state.input);
    console.log("📊 [Data Scientist] Chat History:", JSON.stringify(state.chat_history));
    
    try {
        const historyMsgs = (state.chat_history || []).map(m => {
            if (!m || !m.content) return null;
            return m.role === 'user' ? new HumanMessage(m.content) : new SystemMessage(m.content);
        }).filter(Boolean);
        
        const messages = [...historyMsgs, new HumanMessage(state.input || "Analyze data")];
        
        const result = await analysisAgent.invoke({ messages });
        console.log("📊 [Data Scientist] Result:", result.messages[result.messages.length - 1].content);
        return { agent_response: result.messages[result.messages.length - 1].content };
    } catch (e) {
        console.error("❌ [Data Scientist] Error constructing messages:", e);
        throw e;
    }
};

const workflow = new StateGraph(GraphState)
    .addNode("orchestrator", nodeOrchestrator)
    .addNode("sql_expert", nodeSqlExpert)
    .addNode("data_scientist", nodeDataScientist)
    .addEdge(START, "orchestrator")
    .addConditionalEdges("orchestrator", (s) => s.user_intent, { "SQL_EXPERT": "sql_expert", "DATA_SCIENTIST": "data_scientist" })
    .addEdge("sql_expert", END)
    .addEdge("data_scientist", END);

const app = workflow.compile();

class MultiAgentService {
    async processQuery(queryText, history = []) {
        // Convert input history [{role, content}] to internally consistent format if needed
        const result = await app.invoke({ input: queryText, chat_history: history });
        
        let structuredData = null;
        const rawResponse = result.agent_response || "";
        
        console.log("🕵️ [MultiAgentService] Raw Agent Response:", rawResponse);

        try {
            // Attempt to extract JSON from markdown blocks first
            const jsonMatch = rawResponse.match(/```json\n([\s\S]*?)\n```/) || rawResponse.match(/```([\s\S]*?)```/) || [null, rawResponse];
            const candidate = jsonMatch[1].trim();
            
            const parsedData = JSON.parse(candidate);
            console.log("📋 [MultiAgentService] Parsed JSON:", parsedData);
            
            // � Actualizar schema a v6 si es v5 (compatibilidad)
            if (parsedData.$schema && parsedData.$schema.includes('v5')) {
                parsedData.$schema = 'https://vega.github.io/schema/vega-lite/v6.json';
                console.log("🔧 [MultiAgentService] Schema actualizado de v5 a v6");
            }
            
            // �🔍 DETECCIÓN: Corregir formatos incorrectos automáticamente
            let dataToValidate = parsedData;
            
            // Caso 1: Spec Vega-Lite standalone {$schema, mark, data, ...}
            if (parsedData.$schema && parsedData.$schema.includes('vega')) {
                console.warn("⚠️ [MultiAgentService] Detectado spec Vega-Lite standalone - extrayendo análisis del texto");
                
                // Extraer resumen y conclusión del rawResponse (markdown fuera del JSON)
                const beforeJson = rawResponse.split('```')[0];
                const afterJson = rawResponse.split('```')[2] || '';
                
                // Extraer secciones de markdown
                let resumen = "Análisis de datos completado.";
                let conclusion = "";
                
                // Buscar ## Resumen o ### Resumen
                const resumenMatch = (beforeJson + afterJson).match(/###?\s*Resumen[:\s]*([\s\S]*?)(?=###|$)/i);
                if (resumenMatch) {
                    resumen = resumenMatch[1].trim().substring(0, 500); // Max 500 chars
                }
                
                // Buscar ## Conclusión o ### Conclusión
                const conclusionMatch = (beforeJson + afterJson).match(/###?\s*Conclusi[oó]n[:\s]*([\s\S]*?)(?=###|$)/i);
                if (conclusionMatch) {
                    conclusion = conclusionMatch[1].trim().substring(0, 500);
                }
                
                // Si no hay resumen, usar el texto antes del JSON
                if (resumen === "Análisis de datos completado." && beforeJson.trim()) {
                    resumen = beforeJson.trim().substring(0, 500);
                }
                
                dataToValidate = {
                    resumen: resumen,
                    metrias: [],
                    charts: [{
                        title: "Visualización de Datos",
                        spec: parsedData
                    }],
                    conclusion: conclusion || undefined
                };
                console.log("📝 [Wrapped] Resumen:", resumen.substring(0, 100) + "...");
                console.log("📝 [Wrapped] Conclusión:", conclusion.substring(0, 100) + "...");
            }
            // Caso 2: Chart object con {title, spec} pero sin estructura completa
            else if (parsedData.title && parsedData.spec && parsedData.spec.$schema) {
                console.warn("⚠️ [MultiAgentService] Detectado chart object - extrayendo análisis");
                
                // Igual extraer resumen/conclusión del texto
                const textParts = rawResponse.split('```');
                const beforeJson = textParts[0] || '';
                const afterJson = textParts[2] || '';
                
                let resumen = "Análisis de datos completado.";
                let conclusion = "";
                
                const resumenMatch = (beforeJson + afterJson).match(/###?\s*Resumen[:\s]*([\s\S]*?)(?=###|$)/i);
                if (resumenMatch) resumen = resumenMatch[1].trim().substring(0, 500);
                
                const conclusionMatch = (beforeJson + afterJson).match(/###?\s*Conclusi[oó]n[:\s]*([\s\S]*?)(?=###|$)/i);
                if (conclusionMatch) conclusion = conclusionMatch[1].trim().substring(0, 500);
                
                if (resumen === "Análisis de datos completado." && beforeJson.trim()) {
                    resumen = beforeJson.trim().substring(0, 500);
                }
                
                dataToValidate = {
                    resumen: resumen,
                    metrias: [],
                    charts: [parsedData], // Ya tiene title y spec
                    conclusion: conclusion || undefined
                };
            }
            
            // ✅ VALIDACIÓN CON ZOD
            const validationResult = AgentResponseSchema.safeParse(dataToValidate);
            
            if (validationResult.success) {
                structuredData = validationResult.data;
                console.log("✅ [Zod] Respuesta validada correctamente");
                console.log("📊 [Zod] Charts:", structuredData.charts?.length || 0);
                console.log("📈 [Zod] Metrics:", structuredData.metrias?.length || 0);
            } else {
                console.error("❌ [Zod] Error de validación:", JSON.stringify(validationResult.error.format(), null, 2));
                console.warn("⚠️ [Zod] Usando datos sin validar como fallback");
                // Fallback: Usar datos sin validar pero loggear el problema
                structuredData = dataToValidate;
            }
            
        } catch (e) { 
            console.warn("⚠️ [MultiAgentService] Failed to parse JSON from response:", e.message);
            // Fallback: Try to parse the whole string directly if regex failed or matched weirdly
            try {
                const parsedData = JSON.parse(rawResponse);
                
                // 🔍 DETECCIÓN en fallback: Corregir formatos incorrectos
                let dataToValidate = parsedData;
                
                // Caso 1: Spec Vega-Lite standalone
                if (parsedData.$schema && parsedData.$schema.includes('vega')) {
                    console.warn("⚠️ [Fallback] Detectado spec Vega-Lite standalone - envolviendo");
                    dataToValidate = {
                        resumen: "Visualización generada (formato corregido automáticamente)",
                        metrias: [],
                        charts: [{
                            title: "Gráfica Generada",
                            spec: parsedData
                        }],
                        conclusion: "Por favor revise la visualización."
                    };
                }
                // Caso 2: Chart object con {title, spec}
                else if (parsedData.title && parsedData.spec && parsedData.spec.$schema) {
                    console.warn("⚠️ [Fallback] Detectado chart object - envolviendo");
                    dataToValidate = {
                        resumen: "Visualización generada (formato corregido automáticamente)",
                        metrias: [],
                        charts: [parsedData],
                        conclusion: "Por favor revise la visualización."
                    };
                }
                
                const validationResult = AgentResponseSchema.safeParse(dataToValidate);
                
                if (validationResult.success) {
                    structuredData = validationResult.data;
                    console.log("✅ [Zod] Respuesta validada correctamente (rawResponse directo)");
                } else {
                    console.error("❌ [Zod] Validación falló en rawResponse directo");
                    structuredData = dataToValidate;
                }
            } catch (e2) {
                console.error("❌ [MultiAgentService] No se pudo parsear JSON:", e2.message);
            }
        }

        // If structured data exists, we might want to clean the text shown to user, 
        // OR just send the JSON string if that's the intended behavior.
        // For now, we send the raw response as text, and the object as data.
        return { 
            text: structuredData ? (structuredData.resumen || rawResponse) : rawResponse, 
            data: structuredData 
        };
    }
}
module.exports = new MultiAgentService();