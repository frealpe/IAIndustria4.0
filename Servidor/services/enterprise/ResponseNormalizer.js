/**
 * ResponseNormalizer
 * Convierte salidas del LLM a JSON Enterprise válido
 */

class ResponseNormalizer {

  static normalize(raw) {
    if (!raw) throw new Error("Empty response");

    let text = String(raw).trim();

    // 1️⃣ Remover markdown
    text = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // 2️⃣ Extraer JSON si viene mezclado con texto
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");

    if (first === -1 || last === -1) {
      console.error("[ResponseNormalizer] ❌ No JSON detected. Raw Text:", text);
      throw new Error("No JSON detected in response");
    }

    text = text.substring(first, last + 1);

    // 3️⃣ Parsear
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new Error("Invalid JSON format");
    }

    // 4️⃣ Asegurar estructura enterprise mínima
    return this.ensureEnterpriseShape(parsed);
  }

  /**
   * Garantiza estructura JSON ENTERPRISE SPEC
   */
  static ensureEnterpriseShape(obj) {

    return {
      status: obj.status || "success",

      agent: obj.agent || "UNKNOWN",

      data: Array.isArray(obj.data)
        ? obj.data
        : obj.data ?? [],

      metadata: {
        ...obj.metadata,

        row_count:
          obj.metadata?.row_count ??
          (Array.isArray(obj.data) ? obj.data.length : 0),

        source: obj.metadata?.source || "unknown",

        timestamp: new Date().toISOString()
      }
    };
  }
}

module.exports = ResponseNormalizer;
