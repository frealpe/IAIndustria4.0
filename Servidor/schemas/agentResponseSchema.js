const { z } = require("zod");

/**
 * Schema para una métrica individual (KPI)
 */
const MetricSchema = z.object({
  label: z.string().min(1, "Label no puede estar vacío"),
  value: z.union([z.string(), z.number()]).transform(val => String(val)),
  status: z.enum(['ok', 'warning', 'info', 'critical']).default('info')
});

/**
 * Schema para una gráfica Vega-Lite
 * Valida estructura mínima requerida para renderizado
 */
const VegaLiteChartSchema = z.object({
  title: z.string().min(1, "Título de gráfica requerido"),
  spec: z.object({
    $schema: z.string().url().optional(),
    mark: z.union([
      z.string(), // Tipo simple: "line", "bar", etc.
      z.object({
        type: z.string(),
        point: z.boolean().optional(),
        tooltip: z.boolean().optional()
      }).passthrough() // Permite propiedades adicionales
    ]),
    encoding: z.record(z.any()), // Permite cualquier configuración de encoding
    data: z.object({
      values: z.array(z.record(z.any())).max(500, "Máximo 500 puntos de datos por gráfica")
    }),
    width: z.union([z.number(), z.literal('container')]).optional(),
    height: z.number().optional(),
    autosize: z.any().optional()
  }).passthrough() // Permite campos adicionales de Vega-Lite no especificados
});

/**
 * Schema completo de respuesta del Agente Analista
 * Define la estructura que debe devolver el agente para análisis
 */
const AgentResponseSchema = z.object({
  resumen: z.string().min(10, "Resumen debe tener al menos 10 caracteres"),
  metrias: z.array(MetricSchema).optional().default([]),
  charts: z.array(VegaLiteChartSchema).optional().default([]),
  conclusion: z.string().min(10, "Conclusión debe tener al menos 10 caracteres").optional()
});

// Tipos inferidos para TypeScript/JSDoc
/**
 * @typedef {z.infer<typeof MetricSchema>} Metric
 * @typedef {z.infer<typeof VegaLiteChartSchema>} VegaLiteChart
 * @typedef {z.infer<typeof AgentResponseSchema>} AgentResponse
 */

module.exports = {
  AgentResponseSchema,
  VegaLiteChartSchema,
  MetricSchema
};
