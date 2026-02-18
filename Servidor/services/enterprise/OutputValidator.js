/**
 * OutputValidator
 * Valida que las respuestas cumplan el Enterprise JSON Spec
 */

class OutputValidator {

  static validateResponse(obj) {
    try {

      // 1️⃣ Validar objeto
      if (!obj || typeof obj !== "object") {
        throw new Error("Response must be an object");
      }

      // 2️⃣ Campos obligatorios
      this.require(obj, "status");
      this.require(obj, "agent");
      this.require(obj, "data");
      this.require(obj, "metadata");

      // 3️⃣ Tipos
      if (typeof obj.status !== "string")
        throw new Error("status must be string");

      if (typeof obj.agent !== "string")
        throw new Error("agent must be string");

      if (typeof obj.metadata !== "object")
        throw new Error("metadata must be object");

      // 4️⃣ Reglas por agente
      this.validateByAgent(obj);

      return { success: true };

    } catch (err) {
      return {
        success: false,
        error: {
          message: err.message
        }
      };
    }
  }

  /* ===================================================== */

  static validateByAgent(obj) {
    const agent = obj.agent;

    if (agent === "SQL_EXPERT") {

      if (!Array.isArray(obj.data)) {
        throw new Error("SQL_EXPERT data must be array");
      }

      if (!obj.metadata.sql_query) {
        throw new Error("SQL_EXPERT missing sql_query");
      }

    }

    if (agent === "DATA_SCIENTIST") {

      if (typeof obj.data !== "object") {
        throw new Error("DATA_SCIENTIST data must be object");
      }

      if (obj.visualization && typeof obj.visualization !== "object") {
         throw new Error("DATA_SCIENTIST visualization must be object");
      }

    }
  }

  /* ===================================================== */

  static require(obj, field) {
    if (!(field in obj)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

}

module.exports = OutputValidator;
