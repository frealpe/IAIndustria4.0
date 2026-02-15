const dfd = require("danfojs-node");

/**
 * Realiza el análisis estadístico usando Danfo.js.
 * @param {Array<Object>} flatData - Array de objetos con los datos a analizar.
 * @param {string} tabla - Nombre de la tabla ('caracterizacion', 'comparacion', etc.)
 * @returns {string} - Texto formateado con el resultado del análisis.
 */
function analyzeData(flatData, tabla) {
    if (!flatData || flatData.length === 0) {
        return "No hay datos válidos para analizar.";
    }

    try {
        const df = new dfd.DataFrame(flatData);
        let analysisOutput = "";

        // Lógica según tabla
        let result = { output: "", stats: {} };
        
        // PAD: Si es una agregación (ej: count), no hacemos análisis de voltaje
        if (flatData.length === 1 && !flatData[0].hasOwnProperty('voltaje') && !flatData[0].hasOwnProperty('mean')) {
             return { 
                 output: JSON.stringify(flatData), // Raw JSON for generic queries
                 stats: flatData[0]
             };
        }

        if (tabla === 'comparacion') {
            result = analyzeComparison(df);
        } else {
            result = analyzeGeneral(df, tabla);
        }

        return result; // Returns { output: string, stats: { mean: number, ... } }
    } catch (error) {
        console.error("Error en helper de análisis:", error);
        throw new Error(`Error procesando datos con Danfo.js: ${error.message}`);
    }
}

/**
 * Análisis específico para la tabla 'comparacion' (voltaje0 vs voltaje1).
 */
/**
 * Análisis general para otras tablas (prioriza 'voltaje').
 */
function analyzeGeneral(df, tabla) {
    if (tabla === 'datos' || tabla === 'esp32_log' || (df.columns.includes('mean') && df.columns.includes('resultado'))) {
        let output = "";
        
        // 1. Estadísticas Básicas de Voltaje (mean)
        let voltage;
        if (df.columns.includes('mean')) {
             voltage = df['mean'].asType("float32");
        } else if (df.columns.includes('voltaje')) {
             voltage = df['voltaje'].asType("float32");
        } else if (df.columns.includes('loss')) {
             // Fallback para datos de entrenamiento/inferencia
             voltage = df['loss'].asType("float32"); 
             output += "**Nota:** Analizando 'loss' como proxy de magnitud principal.\n";
        } else {
             output += "⚠️ No se encontraron columnas estándar (mean, voltaje) para análisis estadístico básico.\n\n";
             // Intentamos retornar estadística básica de lo que haya numérico
             const numerics = df.selectDtypes(['float32', 'int32']);
             if (numerics.columns.length > 0) {
                 const bestCol = numerics.columns[0];
                 voltage = df[bestCol];
                 output += `Analizando columna detectada: ${bestCol}\n`;
             }
        }

        if (voltage) {
            output += "### 📊 Análisis de Estabilidad (Danfo.js)\n\n";
            output += `**Estadísticas Generales:**\n` + 
                      `- Promedio: ${voltage.mean().toFixed(4)}\n` +
                      `- Desviación Estándar: ${voltage.std().toFixed(4)}\n` +
                      `- Mínimo: ${voltage.min().toFixed(4)}\n` +
                      `- Máximo: ${voltage.max().toFixed(4)}\n\n`;
        }

        // 2. Análisis de Anomalías
        // Extraemos 'isAnomaly' del objeto resultado si es posible, o asumimos que viene aplanado
        let isAnomalySeries;
        if (df.columns.includes('isAnomaly')) {
            isAnomalySeries = df['isAnomaly'];
        } else if (df.columns.includes('resultado')) {
             // Intento de extracción si no se aplanó antes (aunque McpService lo aplana)
             // Asumimos que McpService ya aplanó y 'isAnomaly' existe si el JSON tenía esa clave
             // Si no, lo intentamos sacar de 'mean' si no hay otra opción, pero mejor fallar soft.
        }

        let anomalyRate = 0;
        let anomalyCount = 0;
        let totalCount = df.shape[0];
        let normalMean = 0;
        let anomalyMean = 0;

        if (isAnomalySeries) {
            const anomalyValues = isAnomalySeries.values;
            anomalyCount = anomalyValues.filter(v => v === true || v === "true").length;
            anomalyRate = (anomalyCount / totalCount) * 100;
            
            // Medias por grupo
            // Filtrado manual robusto
            let normalMean = 0;
            let anomalyMean = 0;
            
            if (voltage) {
                const voltageValues = voltage.values;
                const normalVoltages = voltageValues.filter((v, i) => anomalyValues[i] !== true && anomalyValues[i] !== "true");
                const anomalyVoltages = voltageValues.filter((v, i) => anomalyValues[i] === true || anomalyValues[i] === "true");
                
                normalMean = normalVoltages.length > 0 ? normalVoltages.reduce((a, b) => a + b, 0) / normalVoltages.length : 0;
                anomalyMean = anomalyVoltages.length > 0 ? anomalyVoltages.reduce((a, b) => a + b, 0) / anomalyVoltages.length : 0;
            }

            output += `### 🚨 Análisis de Anomalías\n`;
            output += `- **Total Muestras:** ${totalCount}\n`;
            output += `- **Anomalías Detectadas:** ${anomalyCount} (${anomalyRate.toFixed(2)}%)\n`;
            if (voltage) {
                output += `- **Valor Promedio (Normal):** ${normalMean.toFixed(4)}\n`;
                output += `- **Valor Promedio (Anomalía):** ${anomalyMean.toFixed(4)}\n\n`;
            }
        }

        // 3. Tendencia (Últimos 20 vs Global)
        let currentTrend = 0;
        let globalMean = 0;

        if (voltage) {
            const last20 = voltage.tail(20);
            currentTrend = last20.mean();
            globalMean = voltage.mean();
            const trendDirection = currentTrend > globalMean ? "📈 Tendencia Alcista" : "📉 Tendencia Bajista";

            output += `### 📉 Análisis de Tendencia\n`;
            output += `- **Media Global:** ${globalMean.toFixed(4)}\n`;
            output += `- **Media Reciente (últimos 20):** ${currentTrend.toFixed(4)}\n`;
            output += `- **Dirección:** ${trendDirection} (vs Promedio)\n\n`;
        }

        // 4. Insights Estratégicos
        output += `### 🧠 Insights Estratégicos\n`;
        if (anomalyRate > 10) {
            output += "- ⚠️ **ALERTA CRÍTICA:** La tasa de anomalías es muy alta (>10%). Se recomienda revisión inmediata de sensores.\n";
        } else if (anomalyRate > 0) {
            output += "- ⚠️ **ATENCIÓN:** Presencia de anomalías esporádicas. Monitorear patrones de ruido.\n";
        } else {
            output += "- ✅ **ESTABLE:** Operación dentro de parámetros normales.\n";
        }

        if (voltage && voltage.std() > 0.5) {
             output += "- ⚡ **Volatilidad:** Alta variabilidad detectada. Posible ruido eléctrico o fuente inestable.\n";
        } else if (voltage) {
             output += "- ⚡ **Estabilidad:** El valor se mantiene estable.\n";
        }

        return { 
            output, 
            stats: { 
                mean: globalMean, 
                stdev: voltage ? voltage.std() : 0,
                anomalyRate: anomalyRate,
                lastTrend: currentTrend
            } 
        };
    }

    // Default legacy logic for generic 'voltaje' column
    if (df.columns.includes('voltaje')) {
        const v = df['voltaje'];
        const desc = v.describe();
        output += `### Análisis de Voltaje (${tabla})\n`;
        output += JSON.stringify(dfd.toJSON(desc), null, 2) + "\n\n";
        
        // Detección de outliers
        output += `**Detección de Anomalías (Z-Score > 3):**\n`;
        output += `${detectOutliers(v)}\n`;

        return { 
            output, 
            stats: { 
                mean: v.mean(), 
                stdev: v.std() 
            } 
        };
    } else {
        output += `### Análisis General (${tabla}) - Columna 'voltaje' no encontrada\n`;
        // Intentar describir todo
        try {
            const desc = df.describe();
            // Convert to string safely
            // output += JSON.stringify(dfd.toJSON(desc), null, 2); 
            // Describe devuelve un DF, toJSON lo hace objeto.
        } catch (e) {
            output += "No se pudo generar descripción automática.";
        }
    }

    return { output, stats: {} };
}

/**
 * Detecta outliers usando Z-Score (desviación > 3).
 * @param {Object} series - Serie de Danfo.js
 * @returns {string} - Resumen de outliers detectados.
 */
function detectOutliers(series) {
    const mean = series.mean();
    const std = series.std();
    
    // Si la desviación es 0 (datos planos), no hay outliers
    if (std === 0) return "Sin anomalías (Desviación Estándar = 0).";

    const threshold = 3;
    const lowerBound = mean - (threshold * std);
    const upperBound = mean + (threshold * std);

    // Filtramos los valores fuera de rango
    // Nota: Danfo JS node tiene filtrado limitado, iteramos array de valores para seguridad
    const values = series.values;
    let outlierCount = 0;
    let outliers = [];

    values.forEach(val => {
        if (val < lowerBound || val > upperBound) {
            outlierCount++;
            if (outliers.length < 5) outliers.push(val); // Guardamos solo los primeros 5 para muestra
        }
    });

    if (outlierCount === 0) {
        return "✅ Ningún dato atípico detectado.";
    } else {
        return `⚠️ **${outlierCount} datos atípicos detectados** (Fuera de rango ${lowerBound.toFixed(2)} - ${upperBound.toFixed(2)}). Ejemplos: [${outliers.join(', ')}...]`;
    }
}

/**
 * Ejecuta código dinámico usando Danfo.js
 * @param {Array<Object>} data - Datos crudos (ya aplanados si es necesario)
 * @param {string} codigo - Código JS a ejecutar
 * @returns {Object} - Resultado de la ejecución
 */
function executeDanfoCode(data, codigo) {
    try {
        console.log(`🧪 [ Danfo ] Ejecutando código dinámico sobre ${data.length} filas.`);
        const df = new dfd.DataFrame(data);
        
    // --- SANITIZACIÓN AUTOMÁTICA ROBUSTA ---
    // El agente a veces olvida usar corchetes para columnas que tienen el mismo nombre que métodos de Danfo (ej: mean, std)
    // También reparamos llamadas deprecadas como .toJSON()
    let sanitizedCode = String(codigo);

    // 1. Reemplazos de conveniencia para patrones comunes (df.col -> df['col'])
    // Solo si no es una propiedad Core de Danfo (shape, columns, values, index, dtypes, size)
    const coreProps = ['shape', 'columns', 'values', 'index', 'dtypes', 'size'];
    sanitizedCode = sanitizedCode.replace(/\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (match, prop) => {
        if (coreProps.includes(prop)) return match;
        // Evitar capturar constantes numéricas (el regex ya lo hace al pedir que empiece por letra/_)
        return `['${prop}']`;
    });

    // 2. Reemplazar intentos de casteo/astype/cast por nuestro helper
    sanitizedCode = sanitizedCode.replace(/df(?:\[\s*['\"]?|\.)([a-zA-Z_]\w*)(?:['\"]?\s*\])?\.(?:cast|asType|astype)\s*\([^\)]*\)/gi, "helpers.castSeriesToFloat(df['$1'])");

    // 3. (Removed) .toJSON() is valid and needed for Vega-Lite data mapping
    // sanitizedCode = sanitizedCode.replace(/\.toJSON\s*\(\s*\)/g, '.values');

    // 4. Reemplazar llamadas a .size() (que fallan porque size es propiedad) por .count() (nuestro shim)
    // Solo si parace una llamada de método
    sanitizedCode = sanitizedCode.replace(/\.size\s*\(\s*\)/g, '.count()');

    console.log("🛠️ Código Sanitizado para ejecución:", sanitizedCode);

        // Preparamos un conjunto de utilidades que el agente puede usar dentro del código dinámico.
        const helpers = {
            extractJson: function(series, key) {
                // series: Danfo Series de objetos
                // key: clave a extraer
                const vals = Array.isArray(series.values) ? series.values.map(v => {
                    if (typeof v === 'string') { try { v = JSON.parse(v); } catch(e){} }
                    return (v && typeof v === 'object') ? parseFloat(v[key]) : NaN;
                }) : [];
                return new dfd.Series(vals);
            },
            movingAverage: function(arr, window) {
                if (!Array.isArray(arr)) return [];
                const res = [];
                let sum = 0;
                for (let i = 0; i < arr.length; i++) {
                    const v = Number(arr[i]) || 0;
                    sum += v;
                    if (i >= window) sum -= Number(arr[i - window]) || 0;
                    if (i >= window - 1) res.push(sum / window);
                }
                return res;
            },
            mean: function(arr) {
                if (!Array.isArray(arr) || arr.length === 0) return 0;
                const s = arr.reduce((a, b) => a + Number(b || 0), 0);
                return s / arr.length;
            },
            std: function(arr) {
                if (!Array.isArray(arr) || arr.length === 0) return 0;
                const m = helpers.mean(arr);
                const variance = arr.reduce((s, v) => s + Math.pow(Number(v || 0) - m, 2), 0) / arr.length;
                return Math.sqrt(variance);
            },
            linearRegressionSlope: function(arr) {
                const n = arr.length;
                if (n < 2) return 0;
                const xMean = (n - 1) / 2;
                const yMean = helpers.mean(arr);
                let num = 0;
                let den = 0;
                for (let i = 0; i < n; i++) {
                    const x = i;
                    num += (x - xMean) * (Number(arr[i] || 0) - yMean);
                    den += Math.pow(x - xMean, 2);
                }
                return den === 0 ? 0 : num / den;
            },
            detectVolatilityIncrease: function(lastArr, prevArr) {
                const stdLast = helpers.std(lastArr);
                const stdPrev = helpers.std(prevArr);
                const ratio = stdPrev === 0 ? (stdLast > 0 ? Infinity : 1) : (stdLast / stdPrev);
                return { stdLast, stdPrev, ratio };
            }
        };

        // Añadir método 'rolling' a dfd.Series si no existe para soportar código generado por el agente
        try {
            if (!dfd.Series.prototype.hasOwnProperty('rolling')) {
                Object.defineProperty(dfd.Series.prototype, 'rolling', {
                    configurable: true,
                    writable: true,
                    value: function(opts) {
                        // opts puede ser un objeto {window: n} o un número
                        let window = 1;
                        if (typeof opts === 'object' && opts !== null && opts.window) window = Number(opts.window) || 1;
                        else if (typeof opts === 'number') window = opts;

                        const arr = Array.isArray(this.values) ? this.values.map(v => Number(v || 0)) : [];

                        // Implementamos funciones rolling.mean() y rolling.std() que devuelven dfd.Series
                        return {
                            mean: () => new dfd.Series((() => {
                                const res = [];
                                let sum = 0;
                                for (let i = 0; i < arr.length; i++) {
                                    sum += arr[i];
                                    if (i >= window) sum -= arr[i - window];
                                    if (i >= window - 1) res.push(sum / window);
                                }
                                return res;
                            })()),
                            std: () => new dfd.Series((() => {
                                const res = [];
                                for (let i = 0; i <= arr.length - window; i++) {
                                    const slice = arr.slice(i, i + window);
                                    const m = slice.reduce((a, b) => a + b, 0) / slice.length;
                                    const variance = slice.reduce((s, v) => s + Math.pow(v - m, 2), 0) / slice.length;
                                    res.push(Math.sqrt(variance));
                                }
                                return res;
                            })())
                        };
                    }
                });
            }
        } catch (e) {
            // No fatal si no podemos definir el prototype
            console.warn('No se pudo definir dfd.Series.prototype.rolling:', e.message);
        }
        // Añadir toJSON a Series si no existe para evitar errores deprecados en versiones de danfo
        try {
            if (!dfd.Series.prototype.hasOwnProperty('toJSON')) {
                Object.defineProperty(dfd.Series.prototype, 'toJSON', {
                    configurable: true,
                    writable: true,
                    value: function() {
                        // devolver array de valores (forma simple y estable)
                        return Array.isArray(this.values) ? this.values : [];
                    }
                });
            }
        } catch (e) {
            console.warn('No se pudo definir dfd.Series.prototype.toJSON:', e.message);
        }

        // Utilidad para castear series de Danfo a Series numérica float
        helpers.castSeriesToFloat = function(series) {
            try {
                // series puede ser un objeto Series de Danfo o un array
                const vals = Array.isArray(series.values) ? series.values.map(v => Number(v === null || v === undefined || v === '' ? NaN : v)) : [];
                // Retornamos una Serie de Danfo con valores numéricos
                return new dfd.Series(vals);
            } catch (e) {
                return new dfd.Series([]);
            }
        };

        // Agregar utilidades estadísticas avanzadas
        // Media y desviación móvil
        helpers.rollingMean = function(arr, window) {
            return helpers.movingAverage(arr, window);
        };

        helpers.rollingStd = function(arr, window) {
            if (!Array.isArray(arr) || arr.length === 0) return [];
            const res = [];
            for (let i = 0; i <= arr.length - window; i++) {
                const slice = arr.slice(i, i + window).map(v => Number(v || 0));
                res.push(helpers.std(slice));
            }
            return res;
        };

        // Detección de outliers por Z-score
        helpers.zScoreOutliers = function(input, threshold = 3) {
            const arr = Array.isArray(input) ? input : (input && input.values ? input.values : []);
            if (arr.length === 0) return { outliers: [], indices: [] };
            const m = helpers.mean(arr);
            const s = helpers.std(arr);
            if (s === 0) return { outliers: [], indices: [] };
            const outliers = [];
            const indices = [];
            arr.forEach((v, i) => {
                const z = (Number(v || 0) - m) / s;
                if (Math.abs(z) >= threshold) {
                    outliers.push({ index: i, value: v, z: z });
                    indices.push(i);
                }
            });
            return { outliers, indices, mean: m, std: s };
        };

        // --- SHIMS DE COMPATIBILIDAD FINAL ---
        try {
            // Forzar sobreescritura de métodos que suelen fallar o pedir parámetros extra
            dfd.Series.prototype.std = function() { return helpers.std(this.values); };
            dfd.Series.prototype.mean = function() { return helpers.mean(this.values); };
            dfd.Series.prototype.variance = function() { const s = helpers.std(this.values); return s * s; };
            dfd.Series.prototype.sqrt = function() { 
                return new dfd.Series(this.values.map(v => Math.sqrt(Number(v) || 0))); 
            };

            // Shim para arraySync (evita error si el agente intenta usarlo como tensor)
            const addArraySync = (proto) => {
                if (!proto.arraySync) {
                    proto.arraySync = function() { 
                        return Array.isArray(this.values) ? this.values : []; 
                    };
                }
            };
            
            addArraySync(dfd.Series.prototype);
            addArraySync(dfd.DataFrame.prototype);

            // Intentar aplicar parches al constructor real usado por DataFrame si es diferente
            try {
                 const patchSeriesPrototype = (proto) => {
                     addArraySync(proto);
                     
                     // Helper interno para obtener valores numéricos ordenados
                     const getSortedNumerics = (vals) => {
                         return vals.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
                     };

                     // Shim para quantile
                     if (!proto.quantile) {
                         proto.quantile = function(q) {
                             const sorted = getSortedNumerics(this.values);
                             if (sorted.length === 0) return NaN;
                             const pos = (sorted.length - 1) * q;
                             const base = Math.floor(pos);
                             const rest = pos - base;
                             if (sorted[base + 1] !== undefined) {
                                 return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
                             } else {
                                 return sorted[base];
                             }
                         };
                     }
                     
                     // Shim para size como función (algunos agentes lo llaman así)
                     if (typeof proto.size !== 'function') {
                         // Si ya existe como propiedad, la guardamos pero permitimos acceso como fn si no choca
                         // En JS no se puede tener prop y metodo con mismo nombre facil, 
                         // pero podemos hacer que una propiedad sea funcion. 
                         // Dificil si danfo lo define como getter.
                         // Mejor estrategia: Si el agente llama .size(), fallará si es propiedad number.
                         // No podemos cambiarlo facilmente si es getter. 
                         // Solución: En sanitización, reemplazamos .size() por .size. O agregamos .count() que es comun.
                         proto.count = function() { return this.values.length; };
                     }

                     // Shim para std/mean si faltan
                     if (!proto.std) proto.std = function() { return helpers.std(this.values); };
                     if (!proto.mean) proto.mean = function() { return helpers.mean(this.values); };
                     
                     // Reaplicar rolling si hace falta
                     if (!proto.rolling) proto.rolling = dfd.Series.prototype.rolling;
                 };

                 if (df && df.columns && df.columns.length > 0) {
                      const firstCol = df.columns[0];
                      // Acceder a la serie de forma segura (bracket o property)
                      const serie = df[firstCol] || (df['$data'] ? df[firstCol] : null); 
                      // Nota: df[colName] retorna la Series
                      if (serie && serie.constructor) {
                           patchSeriesPrototype(serie.constructor.prototype);
                      }
                 }
                 // También al prototipo base por si acaso
                 patchSeriesPrototype(dfd.Series.prototype);

            } catch(e) { console.warn("Could not patch internal Series constructor:", e.message); }


            // Asegurar que rolling esté presente en el prototipo
            dfd.Series.prototype.rolling = function(opts) {
                let window = 1;
                if (typeof opts === 'object' && opts !== null && opts.window) window = Number(opts.window) || 1;
                else if (typeof opts === 'number') window = opts;
                
                const arr = Array.isArray(this.values) ? this.values.map(v => Number(v || 0)) : [];
                const _series = this;

                return {
                    mean: () => {
                        const res = [];
                        let sum = 0;
                        for (let i = 0; i < arr.length; i++) {
                            sum += arr[i];
                            if (i >= window) sum -= arr[i - window];
                            if (i >= window - 1) res.push(sum / window);
                        }
                        return new dfd.Series(res);
                    },
                    std: () => {
                        const res = [];
                        for (let i = 0; i <= arr.length - window; i++) {
                            const slice = arr.slice(i, i + window);
                            res.push(helpers.std(slice));
                        }
                        return new dfd.Series(res);
                    }
                };
            };

            // dfd global shims
            dfd.std = (input) => helpers.std(input && input.values ? input.values : input);
            dfd.mean = (input) => helpers.mean(input && input.values ? input.values : input);
            dfd.linearRegression = (input) => helpers.regressionStats(input && input.values ? input.values : input);
            
        } catch(e) { console.warn("Error applying final shims:", e.message); }

        // Regresión lineal simple - retorna slope, intercept, r, r2, t_stat (no p-valor exacto)
        helpers.regressionStats = function(yInput, xInput) {
            const yArr = Array.isArray(yInput) ? yInput : (yInput && yInput.values ? yInput.values : []);
            const xArr = Array.isArray(xInput) ? xInput : (xInput && xInput.values ? xInput.values : null);
            
            if (!Array.isArray(yArr) || yArr.length < 2) return { slope: 0, intercept: 0, r: 0, r2: 0 };
            const n = yArr.length;
            const x = Array.isArray(xArr) && xArr.length === n ? xArr.map(Number) : yArr.map((_, i) => i);
            const y = yArr.map(Number);
            const xMean = helpers.mean(x);
            const yMean = helpers.mean(y);
            let num = 0, den = 0;
            for (let i = 0; i < n; i++) {
                num += (x[i] - xMean) * (y[i] - yMean);
                den += Math.pow(x[i] - xMean, 2);
            }
            const slope = den === 0 ? 0 : num / den;
            const intercept = yMean - slope * xMean;
            // r and r2
            let ssTot = 0, ssRes = 0, ssX = 0;
            for (let i = 0; i < n; i++) {
                const yPred = intercept + slope * x[i];
                ssRes += Math.pow(y[i] - yPred, 2);
                ssTot += Math.pow(y[i] - yMean, 2);
                ssX += Math.pow(x[i] - xMean, 2);
            }
            const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
            const r = Math.sqrt(Math.max(0, r2));
            // standard error for slope and t-stat
            const se = ssX === 0 ? 0 : Math.sqrt((ssRes / (n - 2)) / ssX);
            const tStat = se === 0 ? 0 : slope / se;
            return { slope, intercept, r, r2, tStat, df: n - 2 };
        };

        // Mann-Kendall trend test (non-parametric) with normal approximation p-value
        helpers.mannKendall = function(arr) {
            if (!Array.isArray(arr) || arr.length < 3) return { S: 0, varS: 0, z: 0, p: 1 };
            let S = 0;
            const n = arr.length;
            for (let i = 0; i < n - 1; i++) {
                for (let j = i + 1; j < n; j++) {
                    const diff = arr[j] - arr[i];
                    if (diff > 0) S += 1;
                    else if (diff < 0) S -= 1;
                }
            }
            // variance under H0 (no ties handling for simplicity)
            const varS = (n * (n - 1) * (2 * n + 5)) / 18;
            let z = 0;
            if (S > 0) z = (S - 1) / Math.sqrt(varS);
            else if (S < 0) z = (S + 1) / Math.sqrt(varS);
            else z = 0;
            // two-sided p-value from standard normal
            const p = 2 * (1 - helpers._normalCdf(Math.abs(z)));
            return { S, varS, z, p };
        };

        // CDF de la normal estándar aproximada usando error function
        helpers._normalCdf = function(x) {
            // erf approximation (Abramowitz & Stegun)
            const sign = x < 0 ? -1 : 1;
            const a1 =  0.254829592;
            const a2 = -0.284496736;
            const a3 =  1.421413741;
            const a4 = -1.453152027;
            const a5 =  1.061405429;
            const p = 0.3275911;
            const t = 1.0 / (1.0 + p * Math.abs(x));
            const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
            const erf = sign * y;
            return 0.5 * (1 + erf);
        };

        // Export CSV for plotting (returns string)
        helpers.exportCSV = function(obj) {
            // obj: { header: [..], rows: [[..],..] }
            if (!obj || !Array.isArray(obj.header) || !Array.isArray(obj.rows)) return '';
            const esc = v => (v === null || v === undefined) ? '' : String(v).replace(/"/g, '""');
            let csv = obj.header.map(h => `"${esc(h)}"`).join(',') + '\n';
            obj.rows.forEach(r => {
                csv += r.map(c => `"${esc(c)}"`).join(',') + '\n';
            });
            return csv;
        };

        // ------- Shims y adaptadores para compatibilidad con código generado -------
        // Añadimos dfd.range si no existe
        try {
            if (typeof dfd.range !== 'function') {
                dfd.range = function(start, stop, step = 1) {
                    // si se pasa (stop === undefined) interpretamos como range(0, start)
                    if (stop === undefined) {
                        stop = start;
                        start = 0;
                    }
                    const res = [];
                    for (let i = start; i < stop; i += step) res.push(i);
                    return new dfd.Series(res);
                };
            }

            // LinearRegression shim que usa helpers.regressionStats
            if (typeof dfd.LinearRegression !== 'function') {
                dfd.LinearRegression = function() {
                    this.coef = [0];
                    this.intercept = 0;
                };
                dfd.LinearRegression.prototype.fit = function(xSeries, ySeries) {
                    // xSeries and ySeries may be dfd.Series or arrays
                    const xArr = Array.isArray(xSeries.values) ? xSeries.values.map(Number) : (Array.isArray(xSeries) ? xSeries.map(Number) : []);
                    const yArr = Array.isArray(ySeries.values) ? ySeries.values.map(Number) : (Array.isArray(ySeries) ? ySeries.map(Number) : []);
                    const stats = helpers.regressionStats(yArr, xArr);
                    this.coef = [stats.slope || 0];
                    this.intercept = stats.intercept || 0;
                };
            }

            // Serie: toArray, size getter, values already exists on Series from danfo
            if (!Object.getOwnPropertyDescriptor(dfd.Series.prototype, 'size')) {
                Object.defineProperty(dfd.Series.prototype, 'size', {
                    get: function() { return Array.isArray(this.values) ? this.values.length : 0; }
                });
            }

            if (typeof dfd.Series.prototype.toArray !== 'function') {
                dfd.Series.prototype.toArray = function() { return Array.isArray(this.values) ? this.values : []; };
            }

            if (typeof dfd.Series.prototype.head !== 'function') {
                dfd.Series.prototype.head = function(n = 5) { const arr = Array.isArray(this.values) ? this.values.slice(0, n) : []; return new dfd.Series(arr); };
            }
            if (typeof dfd.Series.prototype.tail !== 'function') {
                dfd.Series.prototype.tail = function(n = 5) { const arr = Array.isArray(this.values) ? this.values.slice(Math.max(0, this.values.length - n)) : []; return new dfd.Series(arr); };
            }

            if (typeof dfd.Series.prototype.filter !== 'function') {
                dfd.Series.prototype.filter = function(fn) { const arr = Array.isArray(this.values) ? this.values.filter(fn) : []; return new dfd.Series(arr); };
            }
        } catch (e) {
            console.warn('Shims warning:', e.message);
        }

        // (Sanitización unificada arriba)

        // Envolvemos en una función segura y pasamos helpers
        const dynamicFunction = new Function('df', 'dfd', 'helpers', sanitizedCode);

        let executionResult;
        try {
            executionResult = dynamicFunction(df, dfd, helpers);
        } catch (execError) {
            const errMsg = `Error ejecutando código Danfo: ${execError.message}`;
            console.error(errMsg);
            return {
                output: `❌ Ejecución con errores.\n${errMsg}`,
                stats: { _error: true, message: execError.message }
            };
        }

        // --- PROCESAMIENTO UNIFICADO DEL RESULTADO ---
        // Convertimos cualquier cosa (Series, DataFrame, Array) a algo legible por el usuario
        const processResult = (res) => {
            if (res === null || res === undefined) return "null";
            if (res instanceof dfd.Series) return res.values;
            if (res instanceof dfd.DataFrame) return dfd.toJSON(res);
            if (typeof res === 'object' && res.hasOwnProperty('values')) return res.values; // Para shims
            return res;
        };

        const finalDataResult = processResult(executionResult);
        const responseText = typeof finalDataResult === 'object'
            ? JSON.stringify(finalDataResult, null, 2)
            : String(finalDataResult);

        return {
            output: responseText, // Return raw JSON text (or string/number) directly
            stats: { 
                raw: finalDataResult,
                is_analysis: true
            }
        };
    } catch (error) {
        throw new Error(`Error ejecutando código Danfo: ${error.message}`);
    }
}

module.exports = {
    analyzeData,
    executeDanfoCode
};
