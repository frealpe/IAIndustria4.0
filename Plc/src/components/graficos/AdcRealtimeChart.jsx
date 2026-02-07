import React, { useEffect, useState } from "react";
import { VegaLite } from "react-vega";

const AdcRealtimeChart = ({ data = [], width = "container", height = 250 }) => {
    const [spec, setSpec] = useState(null);

    useEffect(() => {
        if (!data || data.length === 0) {
            setSpec(null);
            return;
        }

        // Configuración mínima y segura de VegaLite
        const vegaSpec = {
            width: width === "container" ? "container" : width,
            height: height,
            autosize: { type: "fit", contains: "padding" },
            data: { values: data },
            mark: {
                type: "line",
                interpolate: "monotone", // Suavizado
                point: true,
                color: "#d62728" // Rojo Vega
            },
            encoding: {
                x: {
                    field: "id",
                    type: "quantitative",
                    title: "Muestras",
                    axis: { labels: false, ticks: false } // Eje X limpio
                },
                y: {
                    field: "voltaje",
                    type: "quantitative",
                    title: "ADC Value",
                    scale: { zero: false, padding: 10 } // Escala dinámica
                },
                tooltip: [
                    { field: "voltaje", title: "Valor" },
                    { field: "deviceId", title: "Dispositivo" },
                    { field: "timestamp", title: "Time" }
                ]
            },
            config: {
                view: { stroke: "transparent" }
            }
        };

        setSpec(vegaSpec);
    }, [data, width, height]);

    if (!data || data.length === 0) return <div className="text-center text-muted p-5">Esperando datos...</div>;

    const currentDeviceId = data[data.length - 1]?.deviceId || "Desconocido";

    return (
        <div className="w-100 border rounded p-2 bg-white">
            <h6 className="text-primary text-center mb-0">
                {currentDeviceId} <small className="text-muted">({data.length} pts)</small>
            </h6>
            {spec ? (
                <VegaLite spec={spec} actions={false} style={{ width: '100%' }} />
            ) : (
                <div>Cargando...</div>
            )}
        </div>
    );
};

export default AdcRealtimeChart;
