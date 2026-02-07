require('dotenv').config();

const mcpConfig = {
    // Host del servidor MCP (por defecto localhost)
    host: process.env.MCP_HOST || 'localhost',
    
    // Puerto, intenta usar MCP_PORT, luego PORT, luego fallback a 8080 (que vimos en logs) o 3000
    // Nota: Es mejor alinear esto con lo que express usa.
    port: process.env.MCP_PORT || process.env.PORT || 8080,
    
    // Endpoint base para MCP (por defecto /mcp)
    endpoint: process.env.MCP_ENDPOINT || '/mcp',

    /**
     * Construye la URL completa para conectar al cliente MCP
     */
    getFullUrl() {
        return `http://${this.host}:${this.port}${this.endpoint}`;
    }
};

module.exports = mcpConfig;
