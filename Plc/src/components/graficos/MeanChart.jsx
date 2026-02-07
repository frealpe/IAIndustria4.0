import React, { useEffect, useState } from "react";
import { VegaLite } from "react-vega";

const MeanChart = ({ data = [], width = "container", height = 180, xField = "tiempo", yField = "voltaje", agentMean = null }) => {
    const [spec, setSpec] = useState(null);

    useEffect(() => {
        if (!data || data.length === 0) {
            console.warn("⚠️ MeanChart received empty data");
            setSpec(null);
            return;
        }

        console.log("📊 MeanChart Data Sample:", data[0]);

        // 1. Detección Robust de Campos
        const keys = Object.keys(data[0]);
        console.log("📊 MeanChart Keys:", keys);

        const xCandidate = keys.find(k => /tiempo|time|date|fecha|id/i.test(k)) || keys[0];
        const yCandidate = keys.find(k => k !== xCandidate && /voltaje|voltage|value|valor/i.test(k));
        const finalY = yCandidate || keys.find(k => typeof data[0][k] === 'number') || keys[1];
        const finalX = xCandidate;

        console.log(`🎯 MeanChart Fields -> X: ${finalX}, Y: ${finalY}`);

        // 2. Pre-cálculo de Estadísticas en JS
        const validValues = data
            .map(d => parseFloat(d[finalY]))
            .filter(v => !isNaN(v));

        console.log(`🧮 MeanChart Valid Values: ${validValues.length}`);

        if (validValues.length === 0) {
            console.error("❌ No valid numeric values found. Spec set to NULL.");
            setSpec(null);
            return;
        }

        const sum = validValues.reduce((a, b) => a + b, 0);
        const calculatedMean = sum / validValues.length;

        // Prioritize Agent Mean if available
        const mean = (agentMean !== null && agentMean !== undefined) ? Number(agentMean) : calculatedMean;

        console.log(`📊 MeanChart using mean: ${mean} (Source: ${agentMean !== null ? 'Agent' : 'Calculated'})`);

        let variance = 0;
        if (validValues.length > 1) {
            variance = validValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (validValues.length - 1);
        }
        const stdev = Math.sqrt(variance);

        console.log(`📈 MeanChart Stats -> Mean: ${mean}, StDev: ${stdev}`);

        const upper = mean + stdev;
        const lower = mean - stdev;

        // 3. Configuración simplificada de Vega-Lite
        const baseSpec = {
            width: width === "container" ? "container" : width,
            height: height,
            autosize: { type: "fit", contains: "padding" },
            data: { values: data }, // Usamos datos originales
            transform: [
                { window: [{ op: "row_number", as: "index" }] } // CREAR INDICE 1..N
            ],
            layer: [
                // CAPA 1: Puntos dispersos (Datos crudos) - GRIS para contraste
                {
                    mark: { type: "point", opacity: 0.5, tooltip: true, filled: true, size: 40 },
                    encoding: {
                        x: { field: "index", type: "quantitative", title: "Muestras", axis: { labels: false, ticks: false } }, // USAR INDICE
                        y: { field: finalY, type: "quantitative", title: finalY },
                        color: { value: "#999999" } // Gris neutro
                    }
                },
                // CAPA 2 y 3: Líneas de StDev (Azul Suave)
                {
                    mark: { type: "rule", color: "#3498db", strokeDash: [4, 4], size: 1.5, opacity: 0.7 },
                    data: { values: [{}] },
                    encoding: { y: { datum: upper } }
                },
                {
                    mark: { type: "rule", color: "#3498db", strokeDash: [4, 4], size: 1.5, opacity: 0.7 },
                    data: { values: [{}] },
                    encoding: { y: { datum: lower } }
                },
                // CAPA 4: Línea de la Media (NARANJA/ROJO FUERTE)
                {
                    mark: { type: "rule", color: "#ff4500", size: 4 }, // OrangeRed
                    data: { values: [{}] },
                    encoding: { y: { datum: mean } }
                },
                // CAPA 5: Etiqueta de Texto (Valor)
                {
                    mark: { type: "text", align: "left", dx: 8, dy: -8, color: "#ff4500", fontWeight: "bold", fontSize: 13 },
                    data: { values: [{}] },
                    encoding: {
                        y: { datum: mean },
                        text: { value: `x̄ : ${mean.toFixed(2)}${agentMean !== null ? ' (Agent)' : ''}` }
                    }
                }
            ],
            config: {
                view: { stroke: "transparent" }
            }
        };

        setSpec(baseSpec);
    }, [data, width, height, xField, yField, agentMean]);

    if (!data || data.length === 0) return <div className="text-muted p-2">Esperando datos...</div>;

    return (
        <div style={{ width: "100%", height: height, position: 'relative' }}>
            {spec && <VegaLite spec={spec} actions={false} style={{ width: '100%' }} />}
            {/* DEBUG INFO - Remover luego si molesta */}
            <div style={{ position: 'absolute', bottom: 0, right: 0, fontSize: '9px', background: 'rgba(255,255,255,0.7)', padding: '2px', borderRadius: '4px' }}>
                Pts: {data.length} | Y: {Object.keys(data[0])[1]}
            </div>
        </div>
    );
};

export default MeanChart;
