import React, { useEffect, useState, useRef } from "react";
import { VegaLite } from "react-vega";
import * as vl from "vega-lite-api";

// Paleta de colores estándar (D3 category10)
const CATEGORY10 = [
    "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
    "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
];

const AiChartComponent = ({
    data = [],
    width = "container", // Responsive
    height = 400,
}) => {
    const [spec, setSpec] = useState(null);

    useEffect(() => {
        if (!data || data.length === 0) {
            console.log("⚠️ AiChart: No data received");
            setSpec(null);
            return;
        }

        console.log("📊 AiChart: Data received:", data.length, "items");
        console.log("📊 AiChart: Sample data:", data[0]);

        // 1. Detectar columnas NUMÉRICAS para graficar
        // Tomamos el primer registro como muestra
        const sample = data[0];
        const keys = Object.keys(sample);

        console.log("📊 AiChart: Keys found:", keys);

        // Identificar eje X (preferiblemente 'tiempo', 'time', 'date', 'fecha', or 'id')
        const xFieldCandidate = keys.find(k => /tiempo|time|date|fecha|id/i.test(k)) || keys[0];

        // Identificar eje Y (cualquier otro campo numérico)
        // Filtramos campos que no sean el X y que sean números
        const yFieldCandidates = keys.filter(k => k !== xFieldCandidate && typeof sample[k] === 'number');

        console.log("📊 AiChart: X field:", xFieldCandidate);
        console.log("📊 AiChart: Y candidates:", yFieldCandidates);

        // REGLA DE NEGOCIO: Priorizar 'voltaje' si existe
        const preferredY = yFieldCandidates.find(k => /voltaje/i.test(k)) || yFieldCandidates[0];
        if (yFieldCandidates.length === 0) {
            console.warn("❌ AiChart: No numeric Y fields found for plotting.");
            setSpec(null);
            return;
        }

        // Por ahora, graficamos la PRIMERA columna numérica encontrada vs X
        // TODO: Soportar múltiples series si hay múltiples columnas numéricas
        const yField = preferredY;

        console.log(`✅ AiChart: Plotting ${yField} vs ${xFieldCandidate}`);

        // Construir especificación Vega-Lite dinámica
        const baseSpec = vl
            .markLine({ point: true, tooltip: true })
            .encode(
                vl.x().fieldQ(xFieldCandidate).title(xFieldCandidate), // Asumimos Cuantitativo (Q) por defecto
                vl.y().fieldQ(yField).title(yField),
                vl.color().value(CATEGORY10[0])
            )
            .width(width === "container" ? 300 : width) // Fallback simple
            .height(height)
            .autosize({ type: "fit", contains: "padding" })
            .data(data)
            .config({
                view: { stroke: "transparent" },
                axis: { labelFontSize: 11, titleFontSize: 12 },
            })
            .toSpec();

        // Hacer responsive manualmente si width es container
        if (width === "container") {
            baseSpec.width = "container";
        }

        setSpec(baseSpec);
    }, [data, width, height]);

    if (!data || data.length === 0) return null;

    return (
        <div style={{ width: "100%", marginTop: "30px", marginBottom: "10px" }}>
            {spec ? (
                <VegaLite spec={spec} actions={false} style={{ width: '100%' }} />
            ) : (
                <div className="text-muted small">No se pudo generar gráfico con los datos recibidos.</div>
            )}
        </div>
    );
};

export default AiChartComponent;
