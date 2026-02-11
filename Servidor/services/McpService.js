/* Importamos las clases necesarias del SDK de Model Context Protocol (MCP) */
const { McpServer, ResourceTemplate } = require("@modelcontextprotocol/sdk/server/mcp.js");
/* Importamos la librería Zod para la validación de esquemas de datos y tipos */
const { z } = require("zod");
// const dfd = require("danfojs-node"); // Ya no se usa aquí, se movió al helper
const { analyzeData, executeDanfoCode } = require("../helpers/analysisHelper");
/* Importamos la conexión a la base de datos PostgreSQL desde la configuración */
const { dbConnection } = require("../database/config");
const socketService = require("./SocketService"); // Importamos SocketService

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
            version: "1.0.0"
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

        /**
         * Función auxiliar para estandarizar el registro de herramientas.
         * @param {string} name - Nombre único de la herramienta (usado por el LLM)
         * @param {Object} config - Configuración (descripción y esquema Zod)
         * @param {Function} handler - Función asíncrona que ejecuta la lógica
         */
        const register = (name, config, handler) => {
            // this.server.registerTool(name, config, handler); // Registro en SDK oficial (opcional)
            
            // Guardamos localmente para pasárselo a LangChain en MultiAgentService
            this.tools.push({
                name, 
                description: config.description, 
                schema: config.inputSchema, 
                func: handler 
            });
        };
        register(
            "query_db", 
            {
                description: "Genera y ejecuta consultas SQL. ESQUEMA DE BASE DE DATOS:\n" +
                             "- datos (id: serial, prueba: timestamp, resultado: jsonb[{pwm, tiempo, voltaje, ...}])\n" +
                             "- modelo_entrenado (id, device_uid, model_path, accuracy, is_active)\n" +
                             "NOTA: `resultado` es un JSONB array. Usa `jsonb_array_elements(resultado)` para desagregarlo.\n" +
                             "SI EL USUARIO PIDE GRAFICAR, selecciona 'resultado' y el sistema lo enviará al frontend automágicamente.",
                inputSchema: z.object({
                    sql: z.string().describe("SQL query to generate") 
                })
            },
            async ({ sql }) => {
                console.log("🛠️ Executing query_db:", sql);
                try {
                    const pool = dbConnection();
                    const result = await pool.query(sql);
                    
                    // Si hay datos y parece ser una consulta de selección de datos
                    if (result.rows.length > 0) {
                         const lowerSql = sql.toLowerCase();
                         // Heurística simple: Si selecciona 'resultado' o tiene muchos datos, enviamos por socket
                         if (lowerSql.includes('select') && (result.rows.length > 5 || lowerSql.includes('resultado'))) {
                             console.log(`📡 Emitting ${result.rows.length} rows via Socket...`);
                             socketService.emit('mcpdatos', result.rows);
                             return {
                                 content: [{ type: "text", text: `✅ Se han enviado ${result.rows.length} registros al frontend para visualización.` }]
                             };
                         }
                    }

                    // Para consultas pequeñas (count, avg, etc) devolvemos el json
                    return {
                        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }]
                    };
                } catch (err) {
                     return {
                        content: [{ type: "text", text: `Error executing SQL: ${err.message}` }],
                        isError: true
                    };
                }
            }
        );

        /**
         * HERRAMIENTA 2: analizar_datos_avanzado
         * Emite los datos analizados por Socket para que se grafiquen simultáneamente.
         */
        register(
            "analizar_datos_avanzado",
            {
                description: "Realiza un análisis estadístico avanzado de los datos usando Danfo.js. Si es tabla 'comparacion', analiza 'voltaje0' (Planta) y 'voltaje1' (Identificación). Para otras, analiza 'voltaje'. Soporta filtrado por lista de pruebas.",
                inputSchema: z.object({
                    tabla: z.enum(['datos']).describe("Tabla a analizar"),
                    limite: z.number().optional().describe("Cantidad de últimos registros a analizar (default 50) si no se especifican pruebas"),
                    pruebas: z.array(z.string()).optional().describe("Lista de IDs o Timestamps de pruebas específicas a analizar"),
                    codigo: z.string().optional().describe("Código JavaScript/Danfo.js Opcional para ejecutar análisis custom. Variable `df` disponible."),
                    sql: z.string().optional().describe("Consula SQL PERSONALIZADA para seleccionar datos específicos. Si se usa, ignora `tabla`, `limite` y `pruebas`. Las columnas de la consulta serán las del DataFrame.")
                })
            },
            async ({ tabla, limite = 50, pruebas, codigo, sql }) => {
                try {
                    const pool = dbConnection();
                    let query;
                    let params = [];

                    // ... (Mismo código de construcción de query que antes) ...
                    // --- PASO 1: CONSTRUCCIÓN DINÁMICA DE LA CONSULTA SQL ---
                    if (sql) {
                        // Modo SQL Directo (Inteligente)
                        query = sql;
                        console.log("🧠 Ejecutando SQL Inteligente proporcionado por el Agente:", query);
                    } else if (pruebas && pruebas.length > 0) {
                        const isIdSearch = /^\d+$/.test(String(pruebas[0]));
                        const placeholders = pruebas.map((_, i) => `$${i + 1}`).join(',');
                        
                        if (isIdSearch) {
                             query = `SELECT resultado, prueba FROM ${tabla} WHERE id IN (${placeholders})`;
                        } else {
                            query = `SELECT resultado, prueba FROM ${tabla} WHERE prueba = ANY (ARRAY[${placeholders}]::timestamp[])`;
                        }
                        params = pruebas.map(p => String(p));
                    } else {
                        query = `SELECT resultado FROM ${tabla} ORDER BY id DESC LIMIT $1`;
                        params = [limite];
                    }

                    // --- PASO 2: EJECUCIÓN Y PROCESAMIENTO ---
                    const result = await pool.query(query, params);
                    console.log(`🔍 DB Result: Found ${result.rows.length} rows.`);

                    if (result.rows.length === 0) {
                        return { content: [{ type: "text", text: "No hay datos para analizar con los criterios dados (SQL o Filtros)." }] };
                    }

                    // Preprocesamiento de datos:
                    // Si usamos SQL directo, los datos son tal cual vienen (ej: SELECT count(*) as c ...)
                    // Si usamos la lógica por defecto (SELECT resultado...), hay que aplanar el JSONB.
                    let finalData = [];
                    
                    if (sql) {
                        // Si es SQL personalizado, usamos las filas tal cual
                         /* 
                           Intento de mejora inteligente:
                           Si el SQL selecciona 'resultado' o 'data', intentamos parsear JSON si viene como string.
                           Pero por defecto confiamos en que el agente selecciona columnas planas.
                        */
                        finalData = result.rows;
                    } else {
                        // Lógica Híbrida: Si hay 'resultado', aplanamos. Si no (ej: count), pasamos la fila tal cual.
                        result.rows.forEach(row => {
                            if (row.resultado) {
                                // Caso Estándar: Datos en columna JSONB 'resultado'
                                let rowData = row.resultado;
                                if (typeof rowData === 'string') { try { rowData = JSON.parse(rowData); } catch(e) {} }

                                if (Array.isArray(rowData)) {
                                    finalData = finalData.concat(rowData);
                                } else if (typeof rowData === 'object' && rowData !== null) {
                                    finalData.push(rowData);
                                }
                            } else {
                                // Caso Agregación/Proyección SQL (ej: SELECT count(*) ...)
                                // Pasamos la fila tal cual para que analysisHelper la detecte como agregación
                                finalData.push(row);
                            }
                        });
                    }

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

                } catch (error) {
                    console.error("Error en análisis Danfo:", error);
                    return {
                        content: [{ type: "text", text: `Error en análisis: ${error.message}` }],
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
}

module.exports = new McpService();
