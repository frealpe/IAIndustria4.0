# Guía de Pruebas: Agente de Análisis (Data Scientist)

Para probar el Agente de Análisis (Data Scientist) en combinación con el Agente SQL, utiliza los siguientes "prompts" en el chat.

## 🎯 Prompts Verificados

Estos comandos activan el flujo `SQL Expert -> Data Scientist` correctamente:

1.  **Tendencia Básica**:
    > "Analiza la tendencia de Planta1"
    *(Este prompt busca los últimos datos de "Planta1" y calcula estadísticas básicas)*

2.  **Estadística Descriptiva**:
    > "Dame un resumen estadístico (media, desviación) de los datos de Planta1"

3.  **Detección de Anomalías**:
    > "¿Hay anomalías en los registros recientes de Planta1?"
    *(El agente buscará valores donde `isAnomaly` sea true o calculará desviaciones)*

4.  **Comparación (Avanzado)**:
    > "Compara el promedio de pérdida (loss) de los últimos 50 registros con los anteriores 50 de Planta1"

5.  **Análisis de Estabilidad (Coeficiente de Variación)**:
    > "Calcula el coeficiente de variación del voltaje (mean) de Planta1 para determinar determinar su estabilidad"
    *(El agente calculará `std / mean` sobre la columna `mean`)*

---

## ⚙️ Cómo Funciona (Logic Flow)

1.  **Orquestador**: Detecta la intención del usuario. Si pides datos de la BD o análisis, envía al **SQL Expert**.
2.  **Agente SQL**:
    -   Interpreta "Planta1".
    -   Consulta la tabla `devices` para obtener el `device_uid` (ej: `ESP32...`).
    -   Hace un JOIN con la tabla `datos` para traer los registros crudos.
    -   Devuelve un JSON con el dataset.
3.  **Data Scientist**:
    -   Recibe el dataset del paso anterior.
    -   Detecta palabras clave como "analiza", "tendencia", etc.
    -   Ejecuta código **Danfo.js** (similar a Pandas) para procesar los datos.
    -   Devuelve el resultado final (texto o JSON).

## 🛠️ Solución de Problemas Comunes

*   **Error "Dataset vacío"**: Significa que el Agente SQL no encontró registros. Verifica que el nombre del dispositivo ("Planta1") exista en la tabla `devices`.
*   **Error "Tool not found"**: Ya fue corregido (era un prefijo `functions.` incorrecto).
*   **Respuesta de Texto**: A veces el agente prefiere explicar el análisis en texto en lugar de JSON estructurado. Esto es válido.
