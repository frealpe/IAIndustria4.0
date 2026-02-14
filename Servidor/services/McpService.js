const fs = require("fs");
const path = require("path");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { z } = require("zod");
const { analyzeData, executeDanfoCode } = require("../helpers/analysisHelper");
const { dbConnection } = require("../database/config");
const socketService = require("./SocketService"); 
const { DB_SCHEMA } = require("../constants/schema");

class McpService {
    constructor() {
        if (McpService.instance) return McpService.instance;
        this.server = new McpServer({ name: "Servidor MCP Industrial", version: "1.2.0" });
        this.registerTools();
        McpService.instance = this;
    }

    registerTools() {
        this.tools = []; 
        const register = (name, config, handler) => {
            this.tools.push({ name, description: config.description, schema: config.inputSchema, func: handler });
        };

        register("query_db", {
            description: "Ejecuta SQL SELECT en PostgreSQL. Esquema:\n" + DB_SCHEMA + "\n💡 Para análisis estadísticos avanzados, regresiones y visualizaciones usa 'analizar_datos_avanzado'.",
            inputSchema: z.object({ sql: z.string().describe("Consulta SQL") })
        }, async ({ sql }) => await this._executeQuery(sql));

        register("leer_archivos_proyecto", {
            description: "Lee archivos del proyecto. Útil para entender firmware.",
            inputSchema: z.object({ ruta: z.string().describe("Ruta relativa") })
        }, async ({ ruta }) => {
            try {
                const projectRoot = '/home/fabio/Escritorio/IA/MCP';
                const fullPath = path.resolve(projectRoot, ruta);
                if (!fullPath.startsWith(projectRoot)) return { content: [{ type: "text", text: "Acceso denegado." }], isError: true };
                if (!fs.existsSync(fullPath)) return { content: [{ type: "text", text: "No existe." }], isError: true };
                const stats = fs.lstatSync(fullPath);
                if (stats.isDirectory()) return { content: [{ type: "text", text: `Directorio: ${fs.readdirSync(fullPath).join(', ')}` }] };
                return { content: [{ type: "text", text: fs.readFileSync(fullPath, 'utf8') }] };
            } catch (err) { return { content: [{ type: "text", text: err.message }], isError: true }; }
        });

        register("analizar_datos_avanzado", {
            description: "ANALIZA DATOS. Requiere un SQL y opcionalmente código JS (Danfo) para usar helpers como regressionStats o zScoreOutliers.",
            inputSchema: z.object({
                sql: z.string().describe("SQL para extraer datos"),
                codigo: z.string().optional().describe("Código JS dinámico usando 'df' y 'helpers'")
            })
        }, async ({ sql, codigo }) => {
            try {
                console.log(`🔍 [ MCP ] analizando_datos_avanzado con SQL: ${sql.substring(0, 200)}...`);
                // Reutilizamos la lógica de consulta interna
                const executionResult = await this._executeQuery(sql, [], true);
                if (executionResult.isError || !executionResult.rows) return executionResult;

                const finalData = executionResult.rows.map(row => {
                    let normalized = { ...row };
                    if (row.resultado) {
                        let rowData = typeof row.resultado === 'string' ? JSON.parse(row.resultado) : row.resultado;
                        if (typeof rowData === 'object' && rowData !== null) Object.assign(normalized, rowData);
                    }
                    return normalized;
                });

                const finalResult = codigo ? executeDanfoCode(finalData, codigo) : analyzeData(finalData, 'datos');
                socketService.emit('mcpdatos', { data: finalData, stats: finalResult.stats });
                return { content: [{ type: "text", text: `ANALYSIS_SUCCESS:\n${finalResult.output}` }] };
            } catch (err) { 
                console.error("❌ [MCP] analizar_datos_avanzado error:", err.message);
                return { 
                    content: [{ 
                        type: "text", 
                        text: `ANALYSIS_ERROR: ${err.message}\nGUIDANCE: Incluye este error en tu respuesta JSON dentro del campo 'resumen'.` 
                    }], 
                    isError: true 
                }; 
            }
        });
    }

    getRawTools() { return this.tools || []; }

    async _executeQuery(sql, params = [], internal = false) {
        try {
            const pool = dbConnection();
            const result = await pool.query(sql, params);
            if (internal) return { rows: result.rows };
            if (result.rows.length > 5) socketService.emit('mcpdatos', result.rows);
            return { content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }] };
        } catch (err) { return { content: [{ type: "text", text: err.message }], isError: true }; }
    }
}
module.exports = new McpService();