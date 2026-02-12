const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { StateGraph, Annotation, START, END } = require("@langchain/langgraph");
const mcpService = require("./McpService");
const { tool } = require("@langchain/core/tools");
const { getChatModel, getLocalModel } = require("./agentes/modelFactory");
const { DB_SCHEMA } = require("../constants/schema");
const { z } = require("zod");

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
        "Eres un Científico de Datos Experto. Tu capacidad especial es PROGRAMAR análisis en tiempo real.\n\n" +
        "ESQUEMA DISPONIBLE:\n" + DB_SCHEMA + "\n\n" +
        "REGLAS CRÍTICAS DE SQL:\n" +
        "1. NOMBRES DE DISPOSITIVOS: Siempre usa `ILIKE '%nombre%'` con comodines. Ejemplo: Si el usuario dice 'Planta 1', usa `dev.name ILIKE '%plant%1%'`.\n" +
        "2. PREFIJOS OBLIGATORIOS: Usa siempre `d.created_at`, `d.id`, `d.device_uid` para evitar errores de ambigüedad con la tabla `devices`.\n" +
        "3. NO ALUCINES: Si las herramientas devuelven 'Sin datos', informa al usuario. NUNCA inventes resultados.\n\n" +
        "LIBRERÍAS EN 'codigo':\n" +
        "- 'df': DataFrame de Danfo.js.\n" +
        "- 'helpers.regressionStats(df['col'])': Devuelve {slope, r2}.\n\n" +
        "--- RESPUESTA FINAL (JSON PLANO OBLIGATORIO) ---\n" +
        "{\n" +
        "  \"resumen\": \"Texto markdown.\",\n" +
        "  \"metrias\": [{ \"label\": \"KPI\", \"value\": \"Valor\", \"status\": \"ok|warning|info\" }],\n" +
        "  \"conclusion\": \"Estrategia.\"\n" +
        "}"
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
    const messages = [...state.chat_history.map(m => m.role === 'user' ? new HumanMessage(m.content) : new SystemMessage(m.content)), new HumanMessage(state.input)];
    const result = await analysisAgent.invoke({ messages });
    console.log("📊 [Data Scientist] Result:", result.messages[result.messages.length - 1].content);
    return { agent_response: result.messages[result.messages.length - 1].content };
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
        try {
            const cleaned = result.agent_response.replace(/```json/g, '').replace(/```/g, '').trim();
            structuredData = JSON.parse(cleaned);
        } catch (e) { }
        return { text: result.agent_response, data: structuredData };
    }
}
module.exports = new MultiAgentService();