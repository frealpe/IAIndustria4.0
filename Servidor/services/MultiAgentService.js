const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { StateGraph, Annotation, START, END } = require("@langchain/langgraph");
const mcpService = require("./McpService");
const { tool } = require("@langchain/core/tools");
const { getChatModel, getLocalModel } = require("./agentes/modelFactory");
const { DB_SCHEMA } = require("../constants/schema");
const { promisify } = require('util');
const { exec } = require('child_process');
const execP = promisify(exec);

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
    llm: model,
    tools: getToolsByName(['query_db']),
    stateModifier: new SystemMessage(
        "Eres un Agente SQL Senior especializado en PostgreSQL para sistemas IoT con datos en JSONB.\n\n" +
        "TU MISIÓN: Generar y ejecutar consultas SQL válidas, y presentar los resultados al usuario.\n\n" +
        "=============================\n" +
        "REGLAS DE SEGURIDAD Y FORMATO (OBLIGATORIAS)\n" +
        "==================================\n\n" +
        "1. SOLO consultas SELECT. PROHIBIDO: INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE.\n" +
        "2. PRESENTACIÓN: Si la herramienta devuelve datos, muéstralos en un formato amigable (como una tabla markdown o una lista).\n" +
        "3. NUNCA uses SELECT * salvo que se pida explícitamente.\n\n" +
        "=============================\n" +
        "ESQUEMA Y REGLAS JSONB\n" +
        "=============================\n" +
        DB_SCHEMA + "\n\n" +
        "--- REGLAS DE SINTAXIS JSONB ---\n" +
        "1. Para desglosar rawValues usa: `CROSS JOIN LATERAL jsonb_array_elements(d.resultado->'rawValues') AS r(rawValue)`\n" +
        "2. Anomalías -> `(resultado->>'isAnomaly')::boolean IS TRUE`\n" +
        "3. Filtros por valor -> `EXISTS (SELECT 1 FROM jsonb_array_elements(resultado->'rawValues') AS v WHERE (v->>'value')::numeric > 200)`\n" +
        "4. Siempre usa alias para las tablas (ej: `datos AS d`).\n" +
        "5. **JOIN:** Siempre usa `d.device_uid = dev.device_uid`.\n" +
        "6. **FILTRO NOMBRE:** Usa `ILIKE '%plant%1%'` para 'Planta 1' o 'Planta1'.\n" +
        "7. **MANEJO DE NULL:** Al ordenar por campos JSONB (como loss), usa `ORDER BY ... DESC NULLS LAST` para evitar registros incompletos.\n" +
        "8. Datos recientes siempre requieren `ORDER BY d.created_at DESC LIMIT 50`."
    )
});

const analysisAgent = createReactAgent({
    llm: model,
    tools: getToolsByName(['analizar_datos_avanzado']),
    stateModifier: new SystemMessage(
        "ERES UN CIENTIFICO DE DATOS EXPERTO (Data Scientist Agent).\n" +
        "TU OBJETIVO: Realizar análisis estadísticos avanzados.\n\n" +
        DB_SCHEMA + "\n\n" +
        "HERRAMIENTAS PRINCIPALES:\n" +
        "1. `analizar_datos_avanzado`: Ejecuta SQL y/o código Danfo.js sobre la tabla `datos` y devuelve un resumen.\n" +
        "2. `query_db`: Ejecuta una consulta SQL arbitraria y devuelve filas (útil para depuración).\n\n" +
        "POLÍTICA DE INVOCACIÓN DE TOOLS (IMPORTANTE):\n" +
        "- Cuando necesites datos brutos para tu análisis, DEVUÉLVEME UN JSON ESTRICTO con la forma:\n" +
        "  { \"action\": \"run_tool\", \"tool\": \"analizar_datos_avanzado\", \"args\": { /* argumentos del tool */ } }\n" +
        "  - Ejemplo: { \"action\": \"run_tool\", \"tool\": \"analizar_datos_avanzado\", \"args\": { \"tabla\": \"datos\", \"sql\": \"SELECT ...\", \"codigo\": \"/* Danfo.js code */\" } }\n" +
        "- Si solo quieres ejecutar SQL para inspección, usa `tool: \"query_db\"` y args: { sql: 'SELECT ...' }.\n" +
        "- SIEMPRE devuelve JSON válido (NO markdown) cuando pidas ejecutar una herramienta.\n\n" +
    "REGLAS PARA CÓDIGO DANFO (si lo generas en `codigo`):\n" +
        "- Accede a columnas como `df['col']`.\n" +
        "- Usa los helpers expuestos: `helpers.rollingMean`, `helpers.regressionStats`, `helpers.zScoreOutliers`, `helpers.castSeriesToFloat`.\n" +
        "- Al retornar datos, usa `df.toJSON()` para mantener los nombres de columnas (ej: `stats: df.toJSON()`).\n" +
        "- La función debe terminar con `return { summary: ..., stats: ... }` para una correcta visualización. NO devuelvas objetos 'plot'.\n\n" +
        "VISUALIZACIÓN (CRÍTICO):\n" +
        "- Si el usuario pide GRAFICAR, DIBUJAR o VISUALIZAR:\n" +
        "  1. Usa `analizar_datos_avanzado` SOLO para obtener los DATOS o ESTADÍSTICAS necesarios (retorna un JSON o array simple).\n" +
        "  2. En tu RESPUESTA DE TEXTO FINAL, genera un bloque markdown ```json con la especificación Vega-Lite v5 COMPLETA.\n" +
        "  3. INYECTA los datos obtenidos directamente en el campo `data: { values: [...] }` del JSON.\n" +
        "- Ejemplo de formato de respuesta para gráfico:\n" +
        "  \"Aquí tienes el gráfico solicitado:\n" +
        "  ```json\n" +
        "  {\n" +
        "    \"$schema\": \"https://vega.github.io/schema/vega-lite/v5.json\",\n" +
        "    \"data\": { \"values\": [{\"cat\": \"A\", \"val\": 10}, {\"cat\": \"B\", \"val\": 20}] },\n" +
        "    \"mark\": \"bar\",\n" +
        "    \"encoding\": {\n" +
        "      \"x\": {\"field\": \"cat\", \"type\": \"nominal\"},\n" +
        "      \"y\": {\"field\": \"val\", \"type\": \"quantitative\"}\n" +
        "    }\n" +
        "  }\n" +
        "  ```\"\n\n" +
    "REGLAS SQL (si generas el parámetro `sql`):\n" +
    "- Para 'Planta 1' usa siempre `dev.name ILIKE '%planta%1%'`.\n" +
    "- Si ordenas por métricas (loss, mean), añade siempre `NULLS LAST` (ej: `ORDER BY loss DESC NULLS LAST`).\n" +
    "- Siempre une tablas por `d.device_uid = dev.device_uid`.\n\n" +
    "RESPONDER: Si ejecutas una herramienta, devuelve SOLO el JSON de acción. Si solo vas a dar interpretación sin ejecutar código, devuelve un texto explicativo.\n\n" +
    "🛑 REGLA ANTI-BUCLES: Si una herramienta falla con el mismo error más de 2 veces, DETENTE. No la vuelvas a llamar con los mismos parámetros. Reporta el error al usuario inmediatamente."
    )
});

// --- Configuración LangGraph StateGraph ---

// 1. Definimos el esquema del Estado
const GraphState = Annotation.Root({
  input: Annotation(),           // Entrada del usuario
  user_intent: Annotation(),     // Decisión del supervisor
  agent_response: Annotation(),  // Respuesta final del agente
  sql_context: Annotation(),     // SQL generado o resultados para handover
});

// 2. Definimos los Nodos

const nodeOrchestrator = async (state) => {
    console.log("--- 🕵️ Orchestrator evaluando solicitud ---");
    
    // Prompt del Sistema para el Orquestador
    const systemPrompt = `Eres el Orquestador Principal de un sistema de análisis de datos industriales IoT.
    Tu trabajo es clasificar la intención del usuario y asignar la tarea al agente experto adecuado.
    
    AGENTES DISPONIBLES:
    1. SQL_EXPERT: Úsalo para consultas de DATOS CRUDOS, búsquedas por fechas, IDs, o listados simples de logs. 
       - Ejemplos: "dame los últimos 10 logs", "busca el registro con id 500", "lista los dispositivos activos".
    2. DATA_SCIENTIST: Úsalo para ANÁLISIS, ESTADÍSTICAS, COMPARACIONES, TENDENCIAS o DETECCIÓN DE ANOMALÍAS.
       - Este agente es más "inteligente" para interpretar la señal.
       - Ejemplos: "analiza las anomalías de hoy", "dame el promedio de pérdida", "hay tendencia de falla?", "calcula la media móvil".

    REGLA DE DECISIÓN:
    - Si la pregunta pide 'CÓMO' están los datos o 'QUÉ SIGNIFICA' algo -> DATA_SCIENTIST.
    - Si la pregunta pide 'VER' o 'MOSTRAR' una lista sin procesar -> SQL_EXPERT.
    
    Responde ESTRICTAMENTE con un objeto JSON:
    {
        "next": "SQL_EXPERT" | "DATA_SCIENTIST",
        "reason": "breve explicación"
    }`;

    // Contador de intentos para evitar reintentos infinitos en caso de parsing fallido
    state._attempts = (state._attempts || 0) + 1;
    if (state._attempts > 3) {
        console.warn('Orquestador: excedido número máximo de intentos, aplicando fallback a SQL_EXPERT');
        return { user_intent: 'SQL_EXPERT' };
    }

    try {
        const response = await model.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(state.input)
        ]);

        // Intentar parsear la respuesta JSON (limpiando posibles bloques de código markdown)
        let content = String(response.content || '').replace(/```json/g, '').replace(/```/g, '').trim();
        let decision;
        try {
            decision = JSON.parse(content);
        } catch (e) {
            console.warn('Orchestrator: no se pudo parsear salida LLM como JSON, usando fallback a SQL_EXPERT. Raw output:', content.substring(0, 400));
            return { user_intent: 'SQL_EXPERT' };
        }

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
    
    // Si el orquestador detectó que se requiere análisis después, guardamos el contexto
    // o si el experto detectó datos, los pasamos.
    return { 
        agent_response: lastMsg.content,
        sql_context: lastMsg.content // Guardamos lo que hizo para el siguiente nodo
    };
};

const nodeDataScientist = async (state) => {
    console.log("--- 📊 Data Scientist ejecutando ---");
    // Evitar re-ejecuciones múltiples del mismo nodo dentro de la misma invocación del grafo
    if (state._data_scientist_ran) {
        console.log('Data Scientist: salto de re-ejecución (ya se ejecutó en esta sesión)');
        return { agent_response: 'Data Scientist: (resultado previamente calculado, salto de re-ejecución)' };
    }

    state._data_scientist_ran = true;

    try {
        // Enriquecer el input del Data Scientist con lo que encontró el SQL Expert si existe
        let enrichedInput = state.input || '';
        if (state.sql_context) {
            console.log('--- 💡 Handover Context found! Enriqueciendo input del Data Scientist ---');
            enrichedInput += `\n\n[CONTEXTO SQL PREVIO]: El SQL Expert ya ha buscado datos. Aquí está su reporte: \n${state.sql_context}. \n\nUSA ESTOS DATOS para realizar el análisis estadístico solicitado usando 'analizar_datos_avanzado'.`;
        }

        // Si la consulta menciona 'anomalía' o 'anomalías' para Planta 1, ejecutamos
        // el script especializado que ya implementa detección y exporta CSV.
        const text = String(state.input || '').toLowerCase();
        const wantsAnom = /anomal/i.test(text);
        const wantsPlanta1 = /planta\s*1|plant\s*1/i.test(text);
        if (wantsAnom && wantsPlanta1) {
            try {
                console.log('Data Scientist: ejecutando script de anomalías para Planta 1...');
                // Ejecutar desde la raíz del proyecto
                const root = require('path').join(__dirname, '..');
                const { stdout, stderr } = await execP('node scripts/analyze_anomalies_planta1.js', { cwd: root, maxBuffer: 10 * 1024 * 1024 });
                if (stderr) console.warn('analyze_anomalies_planta1 stderr:', stderr.substring(0, 200));

                // Intentar extraer el primer objeto JSON impreso por el script
                const idx = stdout.indexOf('\n{');
                let jsonPart = null;
                if (idx !== -1) {
                    // buscamos desde idx hasta la última '}' antes de 'CSV de anomal'
                    const csvPos = stdout.indexOf('CSV de anomal', idx);
                    const endPos = csvPos !== -1 ? csvPos : stdout.length;
                    const candidate = stdout.substring(idx, endPos).trim();
                    // A veces hay texto antes de la llave abierta; intentamos aislar el JSON
                    const firstBrace = candidate.indexOf('{');
                    const lastBrace = candidate.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                        jsonPart = candidate.substring(firstBrace, lastBrace + 1);
                    }
                }

                if (jsonPart) {
                    let parsed;
                    try {
                        parsed = JSON.parse(jsonPart);
                    } catch (e) {
                        console.warn('No se pudo parsear JSON del script de anomalías:', e.message);
                    }

                    const csvLine = stdout.split('\n').find(l => l.includes('CSV de anomalías escrito en:')) || '';
                    const csvPath = csvLine.split(':').slice(1).join(':').trim();

                    const summaryText = `Data Scientist dice: Resumen de anomalías para Planta 1:\n${JSON.stringify(parsed, null, 2)}\nCSV: ${csvPath}`;
                    return { agent_response: summaryText };
                } else {
                    console.warn('Data Scientist: no se encontró JSON en la salida del script, devolviendo salida cruda.');
                    return { agent_response: `Data Scientist (raw): ${stdout.substring(0, 2000)}` };
                }
            } catch (errScript) {
                console.error('Error ejecutando script de anomalías:', errScript.message);
                // Caerá a la ejecución normal del agente más abajo
            }
        }

        const result = await analysisAgent.invoke({
            messages: [new HumanMessage(enrichedInput)]
        }, { recursionLimit: 150 });
        const lastMsg = result.messages[result.messages.length - 1];

        // Intentar parsear la salida del agente como JSON para detectar acciones (run_tool)
        let parsed = null;
        try {
            const txt = String(lastMsg.content || '').trim();
            // limpiar bloques de código si los hubiera
            const cleaned = txt.replace(/```json/g, '').replace(/```/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch (e) {
            parsed = null;
        }

        if (parsed && parsed.action === 'run_tool' && parsed.tool) {
            try {
                const toolName = parsed.tool;
                const args = parsed.args || {};
                console.log(`Data Scientist: invoking tool ${toolName} with args`, args);

                // Buscar la herramienta registrada en MCP
                const rawTools = mcpService.getRawTools();
                const toolEntry = rawTools.find(t => t.name === toolName);
                if (!toolEntry) {
                    return { agent_response: `Data Scientist error: Tool ${toolName} no está registrada.` };
                }

                // Sanitizar SQL si viene en args para corregir joins/qualifiers comunes
                if (args && typeof args.sql === 'string') {
                    let s = args.sql;
                    // Normalizar espacios y newlines para facilitar las correcciones
                    s = s.replace(/\s+/g, ' ').trim();
                    // Colapsar espacios insertados en identificadores con guion bajo (ej: device_ id -> device_id)
                    s = s.replace(/_\s+/g, '_').replace(/\s+_/g, '_');
                    // Quitar espacios alrededor de puntos (ej: d . device_uid -> d.device_uid)
                    s = s.replace(/\s*\.\s*/g, '.');
                    // corregir joins incorrectos que usan device_id/id en vez de device_uid
                    s = s.replace(/\bd\.device_id\s*=\s*dev\.id\b/ig, 'd.device_uid = dev.device_uid');
                    s = s.replace(/\bdevice_id\s*=\s*dev\.id\b/ig, 'd.device_uid = dev.device_uid');
                    s = s.replace(/\bd\.device_id\s*=\s*devices?\.id\b/ig, 'd.device_uid = dev.device_uid');
                    // Si aparecen 'created_at' sin prefijo, añadir 'd.' para evitar ambigüedad
                    try {
                        s = s.replace(/(?<!\.)\bcreated_at\b/ig, 'd.created_at');
                    } catch (e) {
                        // fallback genérico
                        s = s.replace(/\bcreated_at\b/ig, 'd.created_at');
                    }
                    // asegurar ORDER BY created_at -> ORDER BY d.created_at
                    s = s.replace(/ORDER\s+BY\s+created_at/ig, 'ORDER BY d.created_at');
                    args.sql = s;
                    console.log('Data Scientist: SQL sanitizado ->', args.sql.substring(0, 500));
                }

                // Prevención de invocaciones repetidas: limitar ejecuciones de tool desde este nodo
                state._tool_executions = (state._tool_executions || 0) + 1;
                if (state._tool_executions > 3) {
                    return { agent_response: 'Data Scientist: demasiadas ejecuciones de herramienta en este intento, abortando.' };
                }

                // Ejecutar la herramienta (wrapped handler)
                const toolResult = await toolEntry.func(args);

                // toolResult puede ser un objeto con content[] o un texto directo
                if (toolResult && Array.isArray(toolResult.content) && toolResult.content.length > 0) {
                    const text = toolResult.content.map(c => c.text || '').join('\n');
                    return { agent_response: `Data Scientist (tool ${toolName}) dice: ${text}` };
                }

                if (toolResult && typeof toolResult === 'string') {
                    return { agent_response: `Data Scientist (tool ${toolName}) dice: ${toolResult}` };
                }

                return { agent_response: `Data Scientist: ejecución de la herramienta ${toolName} completada.` };

            } catch (errTool) {
                console.error('Error invocando tool solicitada por Data Scientist:', errTool);
                return { agent_response: `Data Scientist error ejecutando tool: ${errTool.message}` };
            }
        }

        return { agent_response: `Data Scientist dice: ${lastMsg.content}` };
    } catch (e) {
        console.error('Error ejecutando Data Scientist:', e.message);
        return { agent_response: `Data Scientist error: ${e.message}` };
    }
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
    // El SQL Expert ahora puede pasar al Data Scientist si la consulta original pedía "Análisis"
    .addConditionalEdges(
        "sql_expert",
        (state) => {
            const text = (state.input || '').toLowerCase();
            const seeksAnalysis = text.includes('analiz') || text.includes('estadístic') || text.includes('tendencia');
            // Si ya corrió el data scientist, terminamos para evitar bucles
            if (seeksAnalysis && !state._data_scientist_ran) {
                console.log("🔄 Handover: SQL Expert -> Data Scientist para análisis.");
                return "data_scientist";
            }
            return "end";
        },
        {
            "data_scientist": "data_scientist",
            "end": END
        }
    )
    .addEdge("data_scientist", END);

// 4. Compilamos
// Compilamos el grafo con un límite de recursión mayor para evitar abortos prematuros
// (esto no soluciona la raíz pero permite diagnósticos más profundos; además tenemos
// un contador de intentos en el orquestador que evita bucles infinitos).
const app = workflow.compile({ recursionLimit: 200 });

/**
 * Servicio Orquestador Multi-Agente (Refactorizado con LangGraph StateGraph)
 */
class MultiAgentService {
    
    async processQuery(queryText) {
        try {
            console.log("🤖 StateGraph recibiendo consulta...");

            const result = await app.invoke({ input: queryText });

            const finalResponse = result.agent_response || "El agente no devolvió una respuesta clara.";

            return {
                text: finalResponse,
                data: null
            };

        } catch (error) {
            console.error("❌ Error en MultiAgentService (Graph):", error);
            // Si el error tiene una respuesta detallada (como de OpenAI)
            const errorMsg = error.message || "Error desconocido";
            return { text: `Error en el grafo: ${errorMsg}`, data: null };
        }
    }
}

module.exports = new MultiAgentService();
