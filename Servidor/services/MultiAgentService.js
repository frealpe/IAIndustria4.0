const mcpService = require("./McpService");
const MultiAgentArchitecture = require("./MultiAgentArchitecture"); // New Architecture
const { z } = require("zod");

const CacheService = require("./CacheService");
const ResponseNormalizer = require("./enterprise/ResponseNormalizer");
const OutputValidator = require("./enterprise/OutputValidator");

const { DB_SCHEMA } = require("../constants/schema");

/* =========================================================
   LEGACY GRAPH REPLACED BY MULTI-AGENT ARCHITECTURE
========================================================= */

// The previous graph logic has been moved to MultiAgentArchitecture.js
// We keep the imports clean and use the new app instance.

const app = MultiAgentArchitecture;

/* =========================================================
   SERVICE
========================================================= */

class MultiAgentService {
  async processQuery(queryText) {
    try {
      const result = await app.invoke({ task: queryText });

      // Extract result from the dashboard spec
      const dashboard = result.dashboard_spec || {};
      const finalData = result.raw_data || [];
      const finalVisualization = dashboard.visualization;
      
      let finalResponse = dashboard.resumen || "Análisis completado.";
      
      // Construir objeto compatible con el frontend legacy y el nuevo
      const compatibleData = {
          ...dashboard,
          data: finalData, // Para dataToGraph
          resultado: finalData, // Alias histórico
      };

      return {
        text: finalResponse,
        data: compatibleData,
        visualization: finalVisualization,
        cache: false 
      };
    } catch (err) {
      console.error('MultiAgentService.processQuery error:', err.message);
      return { text: `Error processing query: ${err.message}`, data: null, cache: false };
    }
  }
}

module.exports = new MultiAgentService();
