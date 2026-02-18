const fs = require("fs");
const path = require("path");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { z } = require("zod");
const { executeDanfoCode } = require("../helpers/analysisHelper");
const { dbConnection } = require("../database/config");
const { DB_SCHEMA } = require("../constants/schema");

class McpService {
    constructor() {
        if (McpService.instance) return McpService.instance;
        this.server = new McpServer({ name: "Servidor MCP Industrial", version: "2.0.1" });
        this.registerTools();
        McpService.instance = this;
    }

    registerTools() {
        this.tools = [];

        const register = (name, config, handler) => {
            this.tools.push({
                name,
                description: config.description,
                schema: config.inputSchema,
                func: handler
            });
        };

        /* ========================= QUERY DB ========================= */

        register("query_db", {
            description: "Ejecuta SQL SELECT.\n" + DB_SCHEMA,
            inputSchema: z.object({ sql: z.string() })
        }, async ({ sql }) => await this._executeQuery(sql));

        /* ========================= LOCAL ANALYSIS ========================= */

        register("analizar_datos_locales", {
            description: "Analiza JSON con Danfo.js. SOLO retorna datos crudos (números, arrays, objetos). NO genera gráficas ni imágenes.",
            inputSchema: z.object({
                datos: z.union([z.string(), z.array(z.record(z.any()))]),
                codigo: z.string()
            })
        }, async ({ datos, codigo }) => {
            console.log(`[McpService] analizar_datos_locales called. Code length: ${codigo.length}`);
            try {
                let data = typeof datos === "string" ? JSON.parse(datos) : datos;

                if (!Array.isArray(data))
                    return this._error("DATA", "Datos debe ser array");

                const result = executeDanfoCode(data, codigo);

                if (!result.success)
                    return this._error("DATA_SCIENTIST", result.error);

                return this._success("DATA_SCIENTIST", result.result);

            } catch (err) {
                return this._error("DATA_SCIENTIST", err.message);
            }
        });
    }

    /* ========================= CORE QUERY ========================= */

    async _executeQuery(sql, params = [], internal = false) {
        try {
            const pool = dbConnection();
            const result = await pool.query(sql, params);

            if (internal) return { rows: result.rows };

            return this._datasetResponse("SQL_EXPERT", result.rows, {
                row_count: result.rows.length,
                sql_query: sql
            });

        } catch (err) {
            return this._error("SQL_EXPERT", err.message);
        }
    }

    /* ========================= HELPERS ========================= */

    _datasetResponse(agent, rows, metadata = {}) {
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    status: "success",
                    agent,
                    data: {
                        type: "dataset",
                        rows,
                        schema: {
                            columns: rows.length ? Object.keys(rows[0]) : []
                        }
                    },
                    metadata: {
                        row_count: rows.length,
                        source: "database",
                        ...metadata
                    }
                })
            }]
        };
    }

    _success(agent, data) {
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    status: "success",
                    agent,
                    data,
                    metadata: {}
                })
            }]
        };
    }

    _error(agent, message) {
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    status: "error",
                    agent,
                    data: null,
                    metadata: { error: message }
                })
            }],
            isError: true
        };
    }

    getRawTools() {
        return this.tools || [];
    }

    getTool(name) {
        return this.tools.find(t => t.name === name);
    }

    /**
     * Ejecuta una herramienta registrada por nombre y devuelve un objeto JS parseado
     * para facilitar su consumo programático.
     */
    async runTool(name, params) {
        const tools = this.getRawTools();
        const entry = tools.find(t => t.name === name);
        if (!entry) throw new Error(`Tool not found: ${name}`);

        const res = await entry.func(params);
        // Intentar parsear content[0].text como JSON si existe
        if (res && Array.isArray(res.content) && res.content[0] && typeof res.content[0].text === 'string') {
            const txt = res.content[0].text;
            try {
                const first = txt.indexOf('{');
                const last = txt.lastIndexOf('}');
                if (first !== -1 && last !== -1) {
                    const jsonText = txt.substring(first, last + 1);
                    const parsed = JSON.parse(jsonText);
                    return { ok: true, parsed, raw: res };
                }
            } catch (e) {
                // fallthrough
            }
        }
        return { ok: true, parsed: null, raw: res };
    }
}

module.exports = new McpService();
