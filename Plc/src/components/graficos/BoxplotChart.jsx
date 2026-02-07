import React, { useEffect, useState } from "react";
import { VegaLite } from "react-vega";

const BoxplotChart = ({ data = [], width = "container", height = 180, xField = "tiempo", yField = "voltaje" }) => {
    const [spec, setSpec] = useState(null);

    useEffect(() => {
        if (!data || data.length === 0) {
            setSpec(null);
            return;
        }

        // 1. Detección de Campos
        const keys = Object.keys(data[0]);
        const yCandidate = keys.find(k => /voltaje|voltage|value|valor/i.test(k));
        const finalY = yCandidate || keys.find(k => typeof data[0][k] === 'number') || keys[1];

        // 2. Extraer valores numéricos
        const values = data.map(d => parseFloat(d[finalY])).filter(v => !isNaN(v));

        if (values.length < 2) {
            setSpec(null);
            return;
        }

        // 3. Calcular Media y Desviación Estándar
        const n = values.length;
        const mean = values.reduce((a, b) => a + b, 0) / n;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
        const stdev = Math.sqrt(variance);

        // 4. Generar curva normal (Synthetic Data)
        // Generamos 100 puntos entre [Mean - 4SD, Mean + 4SD]
        const minX = mean - 4 * stdev;
        const maxX = mean + 4 * stdev;
        const step = (maxX - minX) / 100;

        const curveData = [];
        for (let x = minX; x <= maxX; x += step) {
            // Función de densidad de probabilidad normal (PDF)
            const exponent = -0.5 * Math.pow((x - mean) / stdev, 2);
            const density = (1 / (stdev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
            curveData.push({ x: x, density: density });
        }

        const baseSpec = {
            width: width === "container" ? "container" : width,
            height: height,
            autosize: { type: "fit", contains: "padding" },
            // NO pasamos 'data' bruta aquí, sino los 2 datasets (histograma + curva)
            layer: [
                // CAPA 1: Curva de Gauss (Área Sombreada)
                {
                    data: { values: curveData },
                    mark: { type: "area", opacity: 0.3, color: "#1f77b4", line: { color: "#1f77b4" } },
                    encoding: {
                        x: { field: "x", type: "quantitative", title: finalY },
                        y: { field: "density", type: "quantitative", title: "Densidad" }
                    }
                },
                // CAPA 2: Línea vertical de la Media
                {
                    data: { values: [{ x: mean }] },
                    mark: { type: "rule", color: "red", size: 2, strokeDash: [4, 4] },
                    encoding: { x: { field: "x" } }
                },
                // CAPA 3: Etiqueta Media
                {
                    data: { values: [{ x: mean }] },
                    mark: { type: "text", align: "left", dx: 5, dy: -100, color: "red", fontWeight: "bold" }, // dy arriba
                    encoding: {
                        x: { field: "x" },
                        text: { value: `μ = ${mean.toFixed(2)}` }
                    }
                },
                // CAPA 4: Etiqueta Sigma
                {
                    data: { values: [{ x: mean + stdev }] },
                    mark: { type: "text", align: "left", dx: 5, dy: -50, color: "#1f77b4" },
                    encoding: {
                        x: { field: "x" },
                        text: { value: `σ = ${stdev.toFixed(2)}` }
                    }
                }
            ],
            config: {
                view: { stroke: "transparent" }
            }
        };

        setSpec(baseSpec);
    }, [data, width, height, yField]);

    if (!data || data.length === 0) return null;

    return (
        <div style={{ width: "100%", height: height }}>
            {spec && <VegaLite spec={spec} actions={false} style={{ width: '100%' }} />}
        </div>
    );
};

export default BoxplotChart;
