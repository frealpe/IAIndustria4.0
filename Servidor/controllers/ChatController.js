const chatService = require("../services/MultiAgentService");

/**
 * Controlador para gestionar las interacciones del Chatbot.
 * Recibe mensajes del frontend, inyecta contexto de UI y delega al MultiAgentService.
 */
class ChatController {
    
    /**
     * Maneja la petición POST /chat
     * @param {Object} req - Objeto de solicitud Express
     * @param {Object} res - Objeto de respuesta Express
     */
    async chat(req, res) {
        console.log("📨 ChatController received request:", req.body); // Log de depuración para ver cuerpo de la petición
        
        // Extraemos 'message' del cuerpo. Puede ser string simple o un objeto complejo desde el frontend.
        const { message } = req.body;

        // Validación básica: Si no hay mensaje, devolvemos error 400.
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        // Variable para construir el prompt final que irá al LLM
        let queryText = "";
        
        // Caso 1: Mensaje es texto simple (legacy o pruebas postman)
        if (typeof message === 'string') {
            queryText = message;
        
        // Caso 2: Mensaje es objeto (Estructura estándar del Frontend 'AsistenteBlock')
        // { text: "...", file: "...", selectedTests: [...], selectedTable: "..." }
        } else if (typeof message === 'object') {
            queryText = message.text || ""; // Texto principal del usuario
            
            // 🔹 INYECCIÓN DE CONTEXTO UI: PRUEBAS SELECCIONADAS
            // Verificamos si el usuario seleccionó filas en la tabla (checkboxes)
            if (message.selectedTests && Array.isArray(message.selectedTests) && message.selectedTests.length > 0) {
                 // Identificamos de qué tabla vienen (caracterizacion, comparacion, etc.)
                 const tableContext = message.selectedTable ? ` de la tabla '${message.selectedTable}'` : "";
                 
                 // Inyectamos una instrucción de sistema explícita al final del prompt.
                 // Esto le dice al Agente QUÉ IDs analizar y EN QUÉ TABLA buscar.
                 queryText += `\n\n[SISTEMA - CONTEXTO UI]: El usuario ha seleccionado explícitamente las siguientes pruebas${tableContext} para análisis: ${JSON.stringify(message.selectedTests)}. ÚSALAS para filtrar tus consultas SQL (WHERE id IN ...). La tabla objetivo es '${message.selectedTable || "desconocida"}'.`;
            } else {
                 // Si NO hay selección, simplemente informamos que no hay selección previa, 
                 // permitiendo que el Agente use SQL para buscar sus propios datos.
                 queryText += `\n\n[SISTEMA - CONTEXTO UI]: No hay pruebas seleccionadas en la interfaz. Puedes usar SQL para buscar los datos que necesites.`;
            }

            // 🔹 INYECCIÓN DE CONTEXTO DE ARCHIVOS
            // Si el usuario adjuntó un archivo (JSON/CSV leído en frontend), lo adjuntamos como texto.
            if (message.file) {
                 queryText += "\n\n[CONTEXTO DEL ARCHIVO ADJUNTO]:\n" + (typeof message.file === 'string' ? message.file : JSON.stringify(message.file, null, 2));
            }
        }

        console.log("📝 Query enviada a ChatService:", queryText); // Log para verificar qué se envía exactamente al LLM

        try {
            // Extraer historial del cuerpo de la petición (si existe)
            // Esperamos un array de objetos: [{ role: 'user'|'assistant', content: '...' }]
            const history = req.body.history || [];

            // Llamamos al servicio principal (Agente LangChain) con el prompt enriquecido y el historial
            const { text, data } = await chatService.processQuery(queryText, history);
            
            // Devolvemos la respuesta generada por el agente
            console.log("📤 [ChatController] Sending response to frontend:", text.substring(0, 200) + "...");
            
            let visualization = null;
            let finalResponseText = text;

            try {
                // Limpiar posibles bloques de código markdown ```json ... ```
                const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
                const jsonString = jsonMatch ? jsonMatch[1] : text;

                // Intentar parsear si parece un objeto JSON
                if (jsonString.trim().startsWith("{")) {
                    const parsed = JSON.parse(jsonString);
                    
                    // Si tiene estructura válida de Data Scientist
                    if (parsed.response && (parsed.visualization || parsed.data)) {
                        finalResponseText = parsed.response; // Usar el texto limpio
                        visualization = parsed.visualization || null;
                    }
                }
            } catch (e) {
                console.warn("⚠️ [ChatController] Could not parse JSON for visualization:", e.message);
            }

            res.json({ response: finalResponseText, data, visualization });
        } catch (error) {
            // Manejo de errores del servidor
            console.error("Chat Error:", error);
            res.status(500).json({ error: "Internal Server Error", details: error.message });
        }
    }
}

module.exports = new ChatController();
