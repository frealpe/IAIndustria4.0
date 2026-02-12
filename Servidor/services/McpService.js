/* Importamos las clases necesarias del SDK de Model Context Protocol (MCP) */
const { McpServer, ResourceTemplate } = require("@modelcontextprotocol/sdk/server/mcp.js");
/* Importamos la librería Zod para la validación de esquemas de datos y tipos */
const { z } = require("zod");
// const dfd = require("danfojs-node"); // Ya no se usa aquí, se movió al helper
const { analyzeData, executeDanfoCode } = require("../helpers/analysisHelper");
/* Importamos la conexión a la base de datos PostgreSQL desde la configuración */
const { dbConnection } = require("../database/config");
const socketService = require("./SocketService"); // Importamos SocketService
const { DB_SCHEMA } = require("../constants/schema");

/**
 * Servicio Singleton para gestionar el servidor MCP (Model Context Protocol).
 * Define y registra las herramientas (Tools) que el Agente podrá utilizar.
 */
class McpService {
    
    /**
     * Constructor Singleton.
     * Asegura que solo exista una instancia del servidor MCP.
     */
    constructor() {
        if (McpService.instance) {
            return McpService.instance;
        }

        /* Inicializamos el servidor MCP con metadatos básicos */
        this.server = new McpServer({
            name: "Servidor MCP",
            version: "1.1.0"
        });

        /* Registramos todas las herramientas disponibles */
        this.registerTools();
        
        // this.registerResources(); // Pasarela para recursos futuros

        McpService.instance = this;
    }

    /**
     * Define y registra las herramientas (Tools) del agente.
     * Aquí se especifican los nombres, descripciones, esquemas de entrada (Zod) y la lógica de ejecución.
     */
    registerTools() {
        this.tools = []; 

        // Protección básica anti-bucle: contador de invocaciones de herramientas en este proceso.
        // Si demasiadas herramientas se invocan en un corto periodo, devolvemos un error controlado
        // para evitar recursiones infinitas entre agentes.
        const TOOL_INVOCATION_LIMIT = 12;
        let toolInvocationCount = 0;
        let toolInvocationResetTimer = null;

        /**
         * Función auxiliar para estandarizar el registro de herramientas.
         * @param {string} name - Nombre único de la herramienta (usado por el LLM)
         * @param {Object} config - Configuración (descripción y esquema Zod)
         * @param {Function} handler - Función asíncrona que ejecuta la lógica
         */
        const register = (name, config, handler) => {
            // this.server.registerTool(name, config, handler); // Registro en SDK oficial (opcional)
            // Wrap handler to count invocations and protect against runaway loops
            const wrappedHandler = async (args) => {
                // Inicializar/reset del timer para ventana de conteo
                if (!toolInvocationResetTimer) {
                    toolInvocationResetTimer = setTimeout(() => {
                        toolInvocationCount = 0;
                        toolInvocationResetTimer = null;
                    }, 5000); // ventana 5s
                }

                toolInvocationCount++;
                if (toolInvocationCount > TOOL_INVOCATION_LIMIT) {
                    console.error(`❌ Protección anti-bucle activada: ${toolInvocationCount} invocaciones de tools en ventana corta.`);
                    return {
                        content: [{ type: "text", text: `Error: demasiadas invocaciones de herramientas en ejecución (limit ${TOOL_INVOCATION_LIMIT}). Se abortó para evitar bucle.` }],
                        isError: true
                    };
                }

                try {
                    return await handler(args);
                } finally {
                    // nota: no decrementamos inmediatamente, dejamos que el reset timer lo limpie para evitar contenciones
                }
            };

            // Guardamos localmente para pasárselo a LangChain en MultiAgentService
            this.tools.push({
                name,
                description: config.description,
                schema: config.inputSchema,
                func: wrappedHandler
            });
        };
        register(
            "query_db", 
            {
                description:
                "Genera y ejecuta consultas SQL avanzadas sobre PostgreSQL para análisis de dispositivos IoT, modelos de IA y resultados de inferencia.\n\n" +
                DB_SCHEMA + "\n\n" +
                "=============================\n" +
                "REGLAS IMPORTANTES\n" +
                "=============================\n" +
                "- SIEMPRE usa SELECT (nunca INSERT, UPDATE o DELETE)\n" +
                "- Evita SELECT * cuando sea posible\n" +
                "- Selecciona columnas necesarias para análisis o graficación\n"
                ,

                inputSchema: z.object({
                    sql: z.string().describe("SQL query to generate") 
                })
            },
            async ({ sql }) => {
                return await this._executeQuery(sql);
            }
        );

        /**
         * HERRAMIENTA 2: analizar_datos_avanzado
         * Emite los datos analizados por Socket para que se grafiquen simultáneamente.
         */
        register(
            "analizar_datos_avanzado",
            {
                description: "Realiza un análisis estadístico avanzado de los datos registrados. Soporta filtrado por lista de fechas (created_at) o IDs.",
                inputSchema: z.object({
                    tabla: z.enum(['datos']).describe("Tabla a analizar"),
                    limite: z.number().optional().describe("Cantidad de últimos registros a analizar (default 50) si no se especifican pruebas"),
                    pruebas: z.array(z.string()).optional().describe("Lista de IDs o Fechas (created_at) específicas a analizar"),
                    codigo: z.string().optional().describe("Código JavaScript/Danfo.js Opcional para ejecutar análisis custom. Variable `df` disponible."),
                    sql: z.string().optional().describe("Consulta SQL PERSONALIZADA para seleccionar datos específicos.")
                })
            },
            async ({ tabla, limite = 50, pruebas, codigo, sql }) => {
                try {
                    const pool = dbConnection();
                    let query;
                    let params = [];

                    // --- PASO 1: CONSTRUCCIÓN DINÁMICA DE LA CONSULTA SQL ---
                    if (sql) {
                        query = sql;
                        console.log("🧠 Ejecutando SQL Inteligente:", query);
                    } else if (pruebas && pruebas.length > 0) {
                        const isIdSearch = /^\d+$/.test(String(pruebas[0]));
                        const placeholders = pruebas.map((_, i) => `$${i + 1}`).join(',');
                        
                        if (isIdSearch) {
                             query = `SELECT id, device_uid, mean, resultado, created_at FROM ${tabla} WHERE id IN (${placeholders})`;
                        } else {
                            query = `SELECT id, device_uid, mean, resultado, created_at FROM ${tabla} WHERE created_at = ANY (ARRAY[${placeholders}]::timestamptz[])`;
                        }
                        params = pruebas.map(p => String(p));
                    } else {
                        query = `SELECT id, device_uid, mean, resultado, created_at FROM ${tabla} ORDER BY id DESC LIMIT $1`;
                        params = [limite];
                    }

                    // --- PASO 2: EJECUCIÓN Y PROCESAMIENTO ---
                    const executionResult = await this._executeQuery(query, params, true);
                    
                    if (executionResult.isError) {
                        return executionResult;
                    }

                    const resultRows = executionResult.rows || [];

                    if (resultRows.length === 0) {
                        return { content: [{ type: "text", text: "No hay datos para analizar con los criterios dados (SQL o Filtros)." }] };
                    }

                    // Preprocesamiento de datos:
                    // Si usamos SQL directo, los datos son tal cual vienen (ej: SELECT count(*) as c ...)
                    // Si usamos la lógica por defecto (SELECT resultado...), hay que aplanar el JSONB.
                    let finalData = [];
                    
                    const normalizeRow = (row) => {
                        // Asegurar que claves comunes existan con el casing que espera el Data Scientist y el Frontend
                        const normalized = { ...row };
                        const commonMappings = {
                            'rawvalues': 'rawValues',
                            'isanomaly': 'isAnomaly',
                            'createdat': 'created_at',
                            'deviceuid': 'device_uid',
                            'deviceid': 'device_id'
                        };
                        
                        // Si existe 'resultado', intentar inyectar sus campos en el top level para facilitar análisis
                        if (row.resultado) {
                            let rowData = row.resultado;
                            if (typeof rowData === 'string') { try { rowData = JSON.parse(rowData); } catch(e) {} }
                            if (typeof rowData === 'object' && rowData !== null) {
                                Object.assign(normalized, rowData);
                            }
                        }

                        // Normalización de Casing
                        Object.keys(normalized).forEach(key => {
                            const lowerKey = key.toLowerCase();
                            if (commonMappings[lowerKey] && normalized[commonMappings[lowerKey]] === undefined) {
                                normalized[commonMappings[lowerKey]] = normalized[key];
                            }
                        });

                        // Casters básicos
                        if (normalized.mean !== undefined) normalized.mean = Number(normalized.mean);
                        
                        return normalized;
                    };

                    resultRows.forEach(row => {
                        // Construimos metadatos básicos de la fila si no están en 'resultado'
                        const metadata = { 
                            db_id: row.id, 
                            device_uid: row.device_uid, 
                            mean: row.mean ? Number(row.mean) : null, 
                            created_at: row.created_at 
                        };

                        if (row.resultado && !sql) {
                            // Lógica de aplanamiento estándar para la tabla 'datos' (si no es SQL custom)
                            let rowData = row.resultado;
                            if (typeof rowData === 'string') { try { rowData = JSON.parse(rowData); } catch(e) {} }

                            if (Array.isArray(rowData)) {
                                finalData = finalData.concat(rowData.map(item => normalizeRow({ ...metadata, ...item })));
                            } else {
                                finalData.push(normalizeRow({ ...metadata, ...rowData }));
                            }
                        } else {
                            // En SQL custom o si no hay 'resultado', simplemente normalizamos la fila tal cual
                            finalData.push(normalizeRow(row));
                        }
                    });

                    if (finalData.length === 0) {
                        return { content: [{ type: "text", text: "Los datos encontrados no tienen formato válido." }] };
                    }

                    // --- PASO 3: ANÁLISIS ESTADÍSTICO (HELPER) ---
                    // Si viene código custom, ejecutamos eso. Si no, usamos análisis estándar.
                    let finalResult;
                    if (codigo) {
                         console.log("🧪 Ejecutando código dinámico Danfo integrado...");
                         finalResult = executeDanfoCode(finalData, codigo);
                    } else {
                         finalResult = analyzeData(finalData, tabla);
                    }

                    const { output: analysisOutput, stats } = finalResult;

                    // 🔥 CRÍTICO: Emitir datos aplanados por Socket para graficar en UI
                    // Solo emitimos si tenemos una cantidad razonable de datos puntuales (no agregados como count)
                    // Heurística simple: Si hay más de 1 columna y más de 1 fila, o si es la estructura estándar
                    if (finalData.length > 0 && finalData.length < 2000) {
                        console.log(`📡 Emitting ${finalData.length} analyzed points via Socket...`);
                        socketService.emit('mcpdatos', { data: finalData, stats });
                    }

                    return {
                        content: [{ 
                            type: "text", 
                            text: analysisOutput
                        }]
                    };

                } catch (err) {
                     console.error("❌ Error en analizar_datos_avanzado:", err.message);
                     return {
                        content: [{ 
                            type: "text", 
                            text: `❌ Error de Análisis: ${err.message}. \nHINT: Si usaste un 'sql' personalizado, asegúrate de haber seleccionado las columnas necesarias (ej: mean, loss, rawValues) para el 'codigo' de Danfo. Columnas en el dataset actual: ${finalData.length > 0 ? Object.keys(finalData[0]).join(', ') : 'Ninguna'}` 
                        }],
                        isError: true
                    };
                }
            }
        );

    }

    /**
     * Devuelve la lista de herramientas configuradas.
     * Usado por MultiAgentService para inyectarlas al Agente LangChain.
     * @returns {Array} Array de objetos tool
     */
    getRawTools() {
        return this.tools || [];
    }
    /**
     * Ejeucta una consulta SQL y maneja la emisión por socket.
     * @param {string} sql - Consulta SQL
     * @param {Array} params - Parámetros
     * @param {boolean} internal - Si es true, devuelve las filas en lugar de un objeto MCP directo
     */
    async _executeQuery(sql, params = [], internal = false) {
        console.log(`🛠️ Executing ${internal ? 'internal' : ''} SQL:`, sql);
        try {
            const pool = dbConnection();
            const result = await pool.query(sql, params);
            
            // Si hay datos y parece ser una consulta de selección de datos
            if (result.rows.length > 0) {
                 const lowerSql = sql.toLowerCase();
                 // Heurística simple: Si selecciona 'resultado' o tiene muchos datos, enviamos por socket
                if (lowerSql.includes('select') && (result.rows.length > 5 || lowerSql.includes('resultado'))) {
                     if (!internal) {
                         console.log(`📡 Emitting ${result.rows.length} rows via Socket...`);
                         socketService.emit('mcpdatos', result.rows);
                         
                         // Si son pocos datos (<= 20), los devolvemos también al agente para que los muestre
                        if (result.rows.length <= 20) {
                            return {
                                content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }]
                            };
                        }
                        return {
                            content: [{ type: "text", text: `✅ Se han enviado ${result.rows.length} registros al frontend para visualización.` }]
                        };
                     }
                 }
            }

            if (internal) {
                return { rows: result.rows };
            }

            // Para consultas pequeñas (count, avg, etc) devolvemos el json
            return {
                content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }]
            };
        } catch (err) {
             console.error("SQL Execution Error:", err.message);
             return {
                content: [{ type: "text", text: `Error executing SQL: ${err.message}` }],
                isError: true,
                error: err.message
            };
        }
    }
}

module.exports = new McpService();
