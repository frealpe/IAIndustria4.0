const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { StateGraph, Annotation, START, END } = require("@langchain/langgraph");
const mcpService = require("./McpService");
const { tool } = require("@langchain/core/tools");
const { getChatModel, getLocalModel } = require("./agentes/modelFactory");

// Configuración del modelo base (Nube - Supervisor y Analista)
const model = getChatModel({ temperature: 0 });

// Configuración del modelo Local (Ollama - DeepSeek Coder)
const localModel = getLocalModel();

// Importamos todas las herramientas del MCP
const rawTools = mcpService.getRawTools();

const getToolsByName = (names) => {
    return rawTools
        .filter(t => names.includes(t.name))
        .map(t => tool(t.func, { 
            name: t.name, 
            description: t.description, 
            schema: t.schema 
        }));
};

// --- Definición de Agentes ---

const sqlAgent = createReactAgent({
    llm: localModel,
    tools: getToolsByName(['query_db']),
    stateModifier: new SystemMessage(
        "Eres un Agente SQL Senior. Tu única función es generar consultas SQL precisas basadas en los requerimientos.\n" +
        "- Tienes acceso a la herramienta `query_db`.\n" +
        "- NO analices datos, solo extráelos.\n" +
        "- CONSULTA SIEMPRE la estructura de las tablas antes de asumir nombres de columnas."
    )
});

const analysisAgent = createReactAgent({
    llm: model,
    tools: getToolsByName(['analizar_datos_avanzado']),
    stateModifier: new SystemMessage(
        "Eres un Científico de Datos Experto (Data Scientist Agent).\n" +
        "TU OBJETIVO: Realizar análisis estadísticos avanzados.\n" +
        "HERRAMIENTAS:\n" +
        "1. `analizar_datos_avanzado`: Esta es tu HERRAMIENTA PRINCIPAL. Sirve para análisis estándar y para ejecutar código Danfo personalizado.\n" +
        "   - Si el usuario pide algo genérico ('analiza los datos', 'dame estadísticas'), úsala SIN el parámetro `codigo`.\n" +
        "   - Si el usuario pide algo específico que requiere cálculo (medias móviles, correlaciones, filtros complejos), genera el código JavaScript/Danfo.js y pásalo en el parámetro `codigo`.\n" +
        "   - CONTEXTO DEL CÓDIGO:\n" +
        "     - Tienes acceso a `df` (DataFrame de Danfo.js) y `dfd` (librería Danfo completa).\n" +
        "     - El código se ejecuta dentro de una función, por lo que debes RETORNAR (`return`) el resultado.\n" +
        "     - IMPORTANTE: Verifica las columnas antes de usarlas (`df.columns`). Los datos pueden venir como `voltaje`, `mean`, `loss`, etc. Usa `df.print()` si necesitas depurar.\n" +
        "     - EJEMPLO CÓDIGO:\n" +
        "       `if (df.columns.includes('voltaje')) { return { media: df['voltaje'].mean() }; } else { return { error: 'Columna voltaje no encontrada', cols: df.columns }; }`\n\n" +
        "2.  **CONSULTAS SQL INTELIGENTES:**\n" +
        "    - Puedes enviar un parámetro `sql` a `analizar_datos_avanzado` para filtrar datos EN LA BASE DE DATOS antes de analizarlos.\n" +
        "    - USALO SI: El usuario pide rangos de fechas, condiciones específicas ('donde voltaje > 220') o agregaciones ('búscame el máximo histórico').\n" +
        "    - IMPORTANTE: Si usas `sql`, ASEGÚRATE de seleccionar las columnas necesarias para tu análisis posterior (ej: `SELECT voltaje, loss FROM ...`).\n" +
        "    - Ejemplo: `analizar_datos_avanzado({ sql: \"SELECT * FROM esp32_log WHERE created_at > NOW() - INTERVAL '1 day'\", codigo: \"...\" })`.\n\n" +
        "REGLA DE ORO: NO PIDAS AL USUARIO SELECCIONAR PRUEBAS SI PIDE 'ÚLTIMOS DATOS' O 'TENDENCIA ACTUAL'.\n" +
        "- Si el usuario dice 'últimos 10', 'tendencia actual', 'análisis general':\n" +
        "  Asume `limite: 50` o lo que pida el usuario.\n" +
        "- SOLO pide pruebas si el usuario dice explícitamente 'analiza la prueba X'.\n" + 
        "- PARA CONSULTAS POR NOMBRE DE DISPOSITIVO (ej: 'analiza los ultimos 10 registros de planta1'):\n" +
        "  - Realiza un JOIN o Subconsulta con la tabla `Devices` para obtener el `device_uid` a partir del `name`.\n" +
        "  - Ejemplo SQL: `SELECT * FROM datos WHERE device_uid = (SELECT device_uid FROM Devices WHERE name = 'planta1' LIMIT 1) ORDER BY id DESC LIMIT 10`.\n" +
        "  - ESQUEMA DEVICES: `device_uid` (PK), `name`, `mac_address`.\n" +
        "  - ESQUEMA DATOS: `id`, `device_uid`, `created_at`, `resultado` (JSONB).\n" +
        "  - TABLA MODELOS: `modelo_entrenado` (id, device_uid, model_path, accuracy, is_active).\n" +
        "  - ESTRUCTURA JSON `resultado`: `{ \"loss\": number, \"phase\": string, \"isAnomaly\": boolean, \"rawValues\": [], \"threshold\": number, \"timestamp\": number }`.\n" +
        "  - PARA EXTRAER CAMPOS DEL JSON EN SQL: Usa el operador `->>` (texto) o `->` (json).\n" +
        "  - EJEMPLO ROBUSTO ERROR DE TIPOS: `(resultado->>'isAnomaly')::text = 'true'` (Mejor que ::boolean directo).\n" +
        "  - CONTAR ANOMALÍAS: `SELECT COUNT(*) FROM datos WHERE ... AND (resultado->>'isAnomaly')::text = 'true'`.\n" +
        "- PARA FILTRAR POR VALORES EN ARRAYS (ej: 'voltaje > 220'):\n" +
        "  - Si el usuario da una CONDICIÓN DE VALOR (ej: > 220V), NO pidas seleccionar pruebas. Ejecuta el SQL de filtrado.\n" +
        "  - Usa `EXISTS` con `jsonb_array_elements_text`. Ejemplo: `SELECT * FROM datos WHERE EXISTS (SELECT 1 FROM jsonb_array_elements_text(resultado->'rawValues') as val WHERE val::numeric > 220)`."
    )
});

// --- Configuración LangGraph StateGraph ---

// 1. Definimos el esquema del Estado
const GraphState = Annotation.Root({
  input: Annotation(),           // Entrada del usuario
  user_intent: Annotation(),     // Decisión del supervisor
  agent_response: Annotation(),  // Respuesta final del agente
});

// 2. Definimos los Nodos

// 2. Definimos los Nodos

const nodeOrchestrator = async (state) => {
    console.log("--- 🕵️ Orchestrator evaluando solicitud ---");
    
    // Prompt del Sistema para el Orquestador
    const systemPrompt = `Eres el Orquestador Principal de un sistema de análisis de datos industriales.
    Tu trabajo es clasificar la intención del usuario y asignar la tarea al agente experto adecuado.
    
    Tienes los siguientes agentes disponibles:
    1. SQL_EXPERT: Para consultas de datos crudos, búsquedas por fecha, ID, o últimos registros. (Ej: "dame los últimos 10 logs", "busca el ID 500").
    2. DATA_SCIENTIST: Para análisis, estadísticas, comparaciones, detección de anomalías o gráficas. (Ej: "analiza las anomalías", "compáralo con el promedio", "dame estadísticas").

    Responde ESTRICTAMENTE con un objeto JSON en este formato:
    {
        "next": "SQL_EXPERT" | "DATA_SCIENTIST",
        "reason": "breve explicación"
    }`;

    try {
        const response = await model.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(state.input)
        ]);

        // Intentar parsear la respuesta JSON (limpiando posibles bloques de código markdown)
        let content = response.content.replace(/```json/g, '').replace(/```/g, '').trim();
        let decision = JSON.parse(content);

        console.log("🤖 Orchestrator Decision:", decision);
        
        return { user_intent: decision.next };

    } catch (error) {
        console.error("⚠️ Error en Orchestrator, usando fallback:", error);
        return { user_intent: "SQL_EXPERT" }; // Fallback seguro
    }
};

const nodeSqlExpert = async (state) => {
    console.log("--- 💾 SQL Expert ejecutando ---");
    const result = await sqlAgent.invoke({
        messages: [new HumanMessage(state.input)]
    });
    const lastMsg = result.messages[result.messages.length - 1];
    return { agent_response: `SQL Expert dice: ${lastMsg.content}` }; 
};

const nodeDataScientist = async (state) => {
    console.log("--- 📊 Data Scientist ejecutando ---");
    const result = await analysisAgent.invoke({
        messages: [new HumanMessage(state.input)]
    });
    const lastMsg = result.messages[result.messages.length - 1];
    return { agent_response: `Data Scientist dice: ${lastMsg.content}` };
};

// 3. Construimos el Grafo
const workflow = new StateGraph(GraphState)
    .addNode("orchestrator", nodeOrchestrator)
    .addNode("sql_expert", nodeSqlExpert)
    .addNode("data_scientist", nodeDataScientist)
    // Conexiones
    .addEdge(START, "orchestrator")
    .addConditionalEdges(
        "orchestrator",
        (state) => state.user_intent, 
        {
            "SQL_EXPERT": "sql_expert",
            "DATA_SCIENTIST": "data_scientist"
        }
    )
    .addEdge("sql_expert", END)
    .addEdge("data_scientist", END);

// 4. Compilamos
const app = workflow.compile();

/**
 * Servicio Orquestador Multi-Agente (Refactorizado con LangGraph StateGraph)
 */
class MultiAgentService {
    
    async processQuery(queryText) {
        try {
            console.log("🤖 StateGraph recibiendo consulta...");

            const result = await app.invoke({ input: queryText });

            return {
                text: result.agent_response,
                data: null
            };

        } catch (error) {
            console.error("❌ Error en MultiAgentService (Graph):", error);
            if (error.response) {
                console.error("🔍 Error Response:", error.response.data);
            }
            return { text: "Error procesando tu solicitud con el grafo.", data: null };
        }
    }
}

module.exports = new MultiAgentService();
