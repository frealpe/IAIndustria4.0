const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { StateGraph, Annotation, START, END } = require("@langchain/langgraph");

const mcpService = require("./McpService");
const { tool } = require("@langchain/core/tools");
const { z } = require("zod");

const CacheService = require("./CacheService");
const ResponseNormalizer = require("./enterprise/ResponseNormalizer");
const OutputValidator = require("./enterprise/OutputValidator");

const { DB_SCHEMA } = require("../constants/schema");

const { getChatModel, getLocalModel } = require("./agentes/modelFactory");
const model = getChatModel({ temperature: 0 });

const rawTools = mcpService.getRawTools();

const getToolsByName = (names) =>
  rawTools
    .filter(t => names.includes(t.name))
    .map(t => tool(t.func, { name: t.name, description: t.description, schema: t.schema }));

/* =========================================================
   SQL AGENT
========================================================= */

const sqlAgent = createReactAgent({
  llm: model,
  tools: getToolsByName(['query_db']),
  stateModifier: new SystemMessage(`
Eres un Agente SQL Enterprise.

REGLAS:

1️⃣ SOLO SELECT
2️⃣ NUNCA texto explicativo
3️⃣ RESPONDE EXCLUSIVAMENTE EN JSON
4️⃣ Si piden ANÁLISIS/TENDENCIAS/COMPARACIONES:
   - TU MISION: Extraer el SUPERCONJUNTO de datos crudos necesarios.
   - Ej: "Comparar últimos 10 vs últimos 100" -> Haz SELECT de los últimos 100 (el Data Scientist filtrará los 10).
   - Si piden datos de "Planta1", busca en table 'devices' where name='Planta1' para obtener device_uid y filtrar 'datos'.
   - NUNCA rechaces ni expliques. SOLO JSON.

EJEMPLOS SQL VÁLIDOS:
   - "Analiza Planta1": 
     SELECT d.* FROM datos d JOIN devices dev ON d.device_uid = dev.device_uid WHERE dev.name = 'Planta1' ORDER BY d.created_at DESC LIMIT 100
     (O usando subquery: SELECT * FROM datos WHERE device_uid = (SELECT device_uid FROM devices WHERE name = 'Planta1' LIMIT 1) LIMIT 100)

JSON FORMAT:
{
 "status": "success",
 "agent": "SQL_EXPERT",
 "data": [],
 "metadata": {
   "row_count": number,
   "sql_query": "SELECT ...",
   "source": "database"
 }
}

ESQUEMA:
${DB_SCHEMA}
`)
});

/* =========================================================
   SQL EXPERT TOOL (Wrapper)
========================================================= */

const sqlExpertQueryTool = tool(
  async ({ question }) => {
    try {
      console.log(`[SqlExpertTool] Processing: ${question}`);
      const result = await sqlAgent.invoke({
        messages: [new HumanMessage(question)]
      });
      let raw = result.messages.at(-1).content;
      console.log("DEBUG: Raw SQL output:", raw.substring(0, 100));

      // 1. Strip Markdown
      raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

      // 2. Parse JSON
      let data = JSON.parse(raw);

      // 3. Extract 'data' if wrapped
      if (data.data && Array.isArray(data.data)) {
          console.log("DEBUG: Extracting 'data' array from wrapper");
          data = data.data;
      }

      // 4. Auto-convert numeric strings
      if (Array.isArray(data)) {
        data = data.map(row => {
          const newRow = { ...row };
          for (const key in newRow) {
            const val = newRow[key];
            if (typeof val === 'string' && !isNaN(val) && val.trim() !== '') {
               newRow[key] = Number(val);
            }
          }
          return newRow;
        });
      }
      
      // 5. Return as stringified JSON array
      return JSON.stringify(data);
    } catch (e) {
      console.error("ERROR in sql_expert_query:", e);
      return JSON.stringify({ error: e.message });
    }
  },
  {
    name: "sql_expert_query",
    description: "Consulta la base de datos para obtener un dataset. Usar cuando NO se tienen datos.",
    schema: z.object({
      question: z.string().describe("Pregunta en lenguaje natural sobre los datos requeridos"),
    }),
  }
);

/* =========================================================
   DATA SCIENTIST AGENT
========================================================= */

const analysisAgent = createReactAgent({
  llm: model,
  tools: [...getToolsByName(['analizar_datos_locales']), sqlExpertQueryTool],
  stateModifier: new SystemMessage(`
Eres un DATA SCIENTIST ENTERPRISE AUTÓNOMO especializado en análisis industrial automático.

Tu misión es analizar datos de sensores, dispositivos y procesos industriales usando Danfo.js.

═══════════════════════════════════
🧠 ARQUITECTURA DE TRABAJO
═══════════════════════════════════

Trabajas dentro de un sistema multi-agente con acceso a herramientas.

Tienes DOS herramientas principales:

1️⃣ sql_expert_query → para obtener datos desde base de datos
2️⃣ analizar_datos_locales → para ejecutar análisis Danfo.js

Tu trabajo es decidir CUÁNDO usar cada una.

═══════════════════════════════════════
📡 ACCESO A DATOS (SQL EXPERT)
═══════════════════════════════════════

Si el usuario NO te proporciona datos explícitos:

DEBES primero obtenerlos usando la herramienta:

👉 sql_expert_query

Formato obligatorio:

{
 "action": "run_tool",
 "tool": "sql_expert_query",
 "params": {
   "question": "<pregunta en lenguaje natural sobre los datos que necesitas>"
 }
}

Reglas:

• NO generes SQL manualmente.
• SOLO describe qué datos necesitas.
• El SQL Expert generará la consulta inteligente.
• La respuesta será un DATASET.

═══════════════════════════════════════
📥 FORMATO DEL DATASET
═══════════════════════════════════════

Los datos SIEMPRE vendrán en formato:

{
 "type": "dataset",
 "rows": [...],
 "schema": {...}
}

Debes usar SOLO el array "rows".

═══════════════════════════════════════
⚙️ EJECUCIÓN DE ANÁLISIS (DANFO)
═══════════════════════════════════════

Después de obtener datos:

DEBES ejecutar análisis con la herramienta:

👉 analizar_datos_locales

Formato obligatorio:

{
 "action": "run_tool",
 "tool": "analizar_datos_locales",
 "params": {
   "codigo": "<código Danfo ejecutable>"
 }
}

═══════════════════════════════════════
🧪 REGLAS DEL CÓDIGO DANFO
═══════════════════════════════════════

IMPORTANTE:

• La variable \`df\` YA EXISTE
• NO crear DataFrame
• NO usar new dfd.DataFrame
• NO usar await
4. Código seguro:
   - NO uses \`require\`, \`fs\`, \`child_process\`.
   - NO intente graficar dentro del código (no \`nodeplotlib\`, no \`matplotlib\`, no \`.plot()\`).
   - Solo usa \`df\` (DataFrame) y \`dfd\` (Danfo.js).
   - Retorna siempre un objeto o valor simple.

El código SIEMPRE debe terminar con:

return <resultado>;

Ejemplos válidos:

return df.describe();

return df["mean"].std();

return df.groupby(["device"]).col(["mean"]).mean();

═══════════════════════════════════════
🧠 INTERPRETACIÓN DE RESULTADOS
═══════════════════════════════════════

Después de ejecutar el análisis:

DEBES interpretar el resultado como un experto industrial.

Ejemplos:

• Calcular estabilidad → usar desviación estándar
• Detectar anomalías → comparar percentiles
• Evaluar tendencia → calcular medias móviles
• Analizar señal → usar columna "mean"

═══════════════════════════════════════
📊 MAPPING SEMÁNTICO INDUSTRIAL
═══════════════════════════════════════

"Voltaje", "Señal", "Amplitud" → usar columna \`mean\`
"Estabilidad" → desviación estándar
"Variabilidad" → coeficiente de variación
"Tendencia" → medias móviles
"Anomalía" → percentiles extremos

═══════════════════════════════════════
🔁 FLUJO OBLIGATORIO DE TRABAJO
═══════════════════════════════════════

SIEMPRE sigue este orden:

1️⃣ Determinar si necesitas datos
2️⃣ Llamar sql_expert_query si faltan
3️⃣ Recibir dataset
4️⃣ Ejecutar análisis Danfo
5️⃣ Interpretar resultados
6️⃣ Entregar conclusión

═══════════════════════════════════════
📤 FORMATO DE RESPUESTA FINAL
═══════════════════════════════════════

PARA EJECUTAR HERRAMIENTAS:
RESPONDE SOLO JSON:
{
 "action": "run_tool",
 "tool": "...",
 "params": { ... }
}

PARA RESPUESTA FINAL (CONCLUSIÓN):
RESPONDE SIEMPRE EN ESTE FORMATO JSON:

{
  "response": "<tu explicación experta en texto>",
  "data": <datos relevantes o null (array de objetos)>,
  "visualization": <objeto Vega-Lite COMPLETO o null>
}

SI EL USUARIO PIDE GRÁFICA:
1. Asegúrate de incluir los datos necesarios en la propiedad "data": {"values": [...]} DENTRO del objeto visualization.
2. Usa esos datos para construir el objeto `visualization` usando Vega-Lite.
3. El objeto `values` dentro de `data` en Vega-Lite DEBE ser un array de objetos.

Ejemplo Vega-Lite:
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "Tendencia",
  "data": { "values": [ {"idx": 1, "val": 10}, {"idx": 2, "val": 12} ] },
  "mark": "line",
  "encoding": {
    "x": {"field": "idx", "type": "ordinal"},
    "y": {"field": "val", "type": "quantitative"}
  }
}

═══════════════════════════════════════
🚫 REGLAS CRÍTICAS
═══════════════════════════════════════

NUNCA:

• inventar datos
• generar SQL manual
• analizar sin dataset
• ejecutar código inseguro

SIEMPRE:

• obtener datos primero
• usar herramientas correctamente
• validar resultados
`)
});


/* =========================================================
   STATE GRAPH
========================================================= */

const GraphState = Annotation.Root({
  input: Annotation(),
  user_intent: Annotation(),
  agent_response: Annotation(),
  sql_data: Annotation(),
  sql_query: Annotation(),
  cache_hit: Annotation(),
  analysis_history_id: Annotation(),
});

/* =========================================================
   ORCHESTRATOR
========================================================= */

const nodeOrchestrator = async (state) => {
  const prompt = `
Clasifica la intención del usuario:

1. Si el usuario pide ANÁLISIS, INTERPRETACIÓN, ESTADÍSTICAS, PROMEDIOS, TENDENCIAS o COMPARACIONES (aunque no tenga datos) → Responde "DATA_SCIENTIST".
   - Ej: "Analiza Planta1", "Dime si el voltaje es estable", "Dame estadísticas de los últimos 100".
2. SOLO si el usuario pide listar, consultar o ver datos CRUDOS sin interpretación → Responde "SQL_EXPERT".
   - Ej: "Muestrame los ultimos 10 registros", "Que dispositivos hay?".

Responde JSON:
{"next":"SQL_EXPERT"|"DATA_SCIENTIST"}
`;

  const res = await model.invoke([
    new SystemMessage(prompt),
    new HumanMessage(state.input)
  ]);

  try {
    const intent = JSON.parse(res.content).next;
    console.log(`[Orchestrator] Intent detected: ${intent}`);
    return { user_intent: intent };
  } catch {
    return { user_intent: "SQL_EXPERT" };
  }
};

/* =========================================================
   SQL NODE (ENTERPRISE FIXED)
========================================================= */

const nodeSqlExpert = async (state) => {
  const start = Date.now();

  const result = await sqlAgent.invoke({
    messages: [new HumanMessage(state.input)]
  });
  console.log(`[SqlExpert] Querying: ${state.input}`);
  const raw = result.messages.at(-1).content;
  console.log(`[SqlExpert] Raw Agent Response: ${raw}`);

  try {
    const normalized = ResponseNormalizer.normalize(raw);
    const valid = OutputValidator.validateResponse(normalized);

    if (!valid.success) {
      console.error("❌ SQL Validation Failed:", valid.error.message);
      console.error("📄 Raw Response:", raw);
      // Return a diagnostic response instead of throwing
      return {
        agent_response: `SQL_EXPERT returned invalid response: ${valid.error.message}\nRaw: ${String(raw).slice(0,2000)}`,
        sql_data: normalized?.data || [],
        sql_query: normalized?.metadata?.sql_query,
        execution_time_ms: Date.now() - start
      };
    }

    console.log(`[SqlExpert] Rows retrieved: ${normalized.data.length}`);
    return {
      agent_response: raw,
      sql_data: normalized.data,
      sql_query: normalized.metadata?.sql_query,
      execution_time_ms: Date.now() - start
    };

  } catch (err) {
    console.error('Error normalizing SQL response:', err.message);
    return {
      agent_response: `SQL_EXPERT produced non-JSON response or parsing failed: ${err.message}\nRaw: ${String(raw).slice(0,2000)}`,
      sql_data: [],
      sql_query: null,
      execution_time_ms: Date.now() - start
    };
  }
};


/* =========================================================
   DATA SCIENTIST NODE (ENTERPRISE FIXED)
========================================================= */

const nodeDataScientist = async (state) => {
  const { input, sql_data } = state;
  const start = Date.now();

  // Prepare initial context
  // If we have sql_data passed in (legacy or manual injection), usage it.
  // Otherwise, we pass the instruction and expect the agent to fetch data.
  const initialContext = {
    type: "dataset",
    data_user_instruction: input,
    rows: sql_data || [], // Might be empty initially
    schema: { columns: sql_data && sql_data.length > 0 ? Object.keys(sql_data[0]) : [] }
  };

  let messages = [new HumanMessage(JSON.stringify(initialContext))];
  
  // Multi-turn loop for tool execution
  const MAX_TURNS = 5;
  let finalResponse = "";

  for (let i = 0; i < MAX_TURNS; i++) {
    console.log(`[DataScientist] Turn ${i+1}`);
    const result = await analysisAgent.invoke({ messages });
    const raw = result.messages.at(-1).content;
    
    // Parse response for tool calls
    let toolCall = null;
    try {
      let text = String(raw || '').trim();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const first = text.indexOf('{');
      const last = text.lastIndexOf('}');
      if (first !== -1 && last !== -1) {
          const candidate = text.substring(first, last + 1);
          const parsed = JSON.parse(candidate);
          if (parsed && parsed.action === 'run_tool') {
            toolCall = parsed;
          }
      }
    } catch (e) { /* ignore */ }

    // Execute tool if found
    if (toolCall) {
      console.log(`[DataScientist] Executing tool: ${toolCall.tool}`);
      let toolOutput = "";

      if (toolCall.tool === 'sql_expert_query') {
        try {
           // We use the tool wrapper directly
           toolOutput = await sqlExpertQueryTool.invoke({ question: toolCall.params.question });
        } catch (e) {
           toolOutput = JSON.stringify({ error: `SQL Tool Failed: ${e.message}` });
        }
      } 
      else if (toolCall.tool === 'analizar_datos_locales') {
         // Existing Danfo Logic
         const params = toolCall.params || {};
         // Ensure data availability
         // Note: The agent should have received data from sql_expert_query and passed it back? 
         // Or does the Danfo tool need the data from context?
         // The prompt says: "Recibir dataset -> Ejecutar análisis".
         // Typically the agent passes the data in params if it has it, OR it assumes the environment (variable `df`) has it.
         // BUT our `analizar_datos_locales` implementation expects `datos` in params.
         // If `sql_expert_query` returned data, it's in the conversation history as text.
         // The Agent might try to put the HUGE dataset into the params of `analizar_datos_locales`.
         // THIS IS A RISK.
         // Optimization: If the Agent just says "use previous data", we can inject it.
         // But let's assume the Agent follows instructions and puts data or we handle it.
         
         // Fix: If `params.datos` is missing but we have `rows` in context?
         // Actually, if `sql_expert_query` was called, the OUTPUT is in the history.
         // The Agent should technically pass it to `analizar_datos_locales`.
         // Let's rely on the Agent doing it right or providing the data.
         
         if (!params.datos && initialContext.rows.length > 0) {
            params.datos = initialContext.rows;
         }
         
         // Validation
         const codigo = String(params.codigo || '');
         const forbidden = [/require\s*\(|\bfs\b|child_process|exec\s*\(|spawn\s*\(|eval\s*\(|new\s+Function|process\.|import\s+|await\s+/i];
         const matched = forbidden.find(rx => rx.test(codigo));
         if (matched) {
             toolOutput = JSON.stringify({ error: `Code rejected: ${matched}` });
         } else {
             try {
                const toolRun = await mcpService.runTool(toolCall.tool.replace("functions.", ""), params);
                toolOutput = toolRun.parsed ? JSON.stringify(toolRun.parsed) : (toolRun.raw?.content?.[0]?.text || String(toolRun.raw));
             } catch (e) {
                toolOutput = JSON.stringify({ error: `Danfo Execution Failed: ${e.message}` });
             }
         }
      } else {
         toolOutput = JSON.stringify({ error: `Unknown tool: ${toolCall.tool}` });
      }

      // Append result
      messages.push(new HumanMessage(raw)); // Agent's request
      messages.push(new HumanMessage(JSON.stringify({ type: "tool_result", tool: toolCall.tool, output: toolOutput }))); // Result
      
    } else {
      // Final response (no tool call)
      finalResponse = raw;
      break; 
    }
  }

  return {
    agent_response: finalResponse,
    execution_time_ms: Date.now() - start
  };
};


/* =========================================================
   GRAPH FLOW
========================================================= */

const workflow = new StateGraph(GraphState)
  .addNode("orchestrator", nodeOrchestrator)
  .addNode("sql_expert", nodeSqlExpert)
  .addNode("data_scientist", nodeDataScientist)

  .addEdge(START, "orchestrator")

  .addConditionalEdges("orchestrator",
    s => s.user_intent,
    { SQL_EXPERT: "sql_expert", DATA_SCIENTIST: "data_scientist" })

  .addConditionalEdges("sql_expert",
    // SQL Expert now terminates after its job, assuming Data Scientist is called independently via Orchestrator
    // OR if we want SQL expert to optionally chain, we can keep logic but usually Orchestrator decides.
    // Simplifying: SQL Expert -> END (Frontend displays table).
    // Data Scientist -> END (Frontend displays analysis).
    (s) => "end",
    { end: END })

  .addEdge("data_scientist", END);

const app = workflow.compile({ recursionLimit: 200 });

/* =========================================================
   SERVICE
========================================================= */

class MultiAgentService {
  async processQuery(queryText) {
    try {
      const result = await app.invoke({ input: queryText });

      let finalData = result.sql_data || null;
      let finalVisualization = null;

      // Si el agente es el Data Scientist, el resultado suele estar en result.agent_response como JSON
      if (result.agent_response && typeof result.agent_response === 'string') {
        try {
          const text = result.agent_response.replace(/```json/g, "").replace(/```/g, "").trim();
          const first = text.indexOf("{");
          const last = text.lastIndexOf("}");
          
          if (first !== -1 && last !== -1) {
            const parsed = JSON.parse(text.substring(first, last + 1));
            
            // Extraer campos de forma flexible
            if (parsed.response || parsed.resumen || parsed.data || parsed.visualization) {
              // Si no tenemos sql_data pero el JSON tiene data, lo usamos
              if (!finalData && parsed.data) {
                finalData = parsed.data;
              }
              if (parsed.visualization) {
                finalVisualization = parsed.visualization;
              }
              // Si el texto base no existe, intentamos usar 'response' o 'resumen'
              if (parsed.response || parsed.resumen) {
                result.agent_response = parsed.response || parsed.resumen;
              }
            }
          }
        } catch (e) {
          // No es JSON o no tiene el formato esperado, ignoramos
        }
      }

      return {
        text: result.agent_response,
        data: finalData,
        visualization: finalVisualization,
        cache: result.cache_hit || false
      };
    } catch (err) {
      console.error('MultiAgentService.processQuery error:', err.message);
      return { text: `Error processing query: ${err.message}`, data: null, cache: false };
    }
  }
}

module.exports = new MultiAgentService();
