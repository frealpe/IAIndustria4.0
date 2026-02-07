import React, { useEffect, useState } from "react";
import { VegaLite } from "react-vega";

const HistogramChart = ({ data = [], width = "container", height = 180, field = "voltaje" }) => {
    const [spec, setSpec] = useState(null);

    useEffect(() => {
        if (!data || data.length === 0) {
            setSpec(null);
            return;
        }

        // Robust Field Detection
        const keys = Object.keys(data[0]);
        // Prioritize 'voltaje' or similar, then any number
        const targetField = keys.find(k => /voltaje|voltage|value|valor/i.test(k)) || keys.find(k => typeof data[0][k] === 'number') || keys[1];

        const baseSpec = {
            width: width === "container" ? "container" : width,
            height: height,
            autosize: { type: "fit", contains: "padding" },
            data: { values: data },
            mark: "bar",
            encoding: {
                x: {
                    field: targetField,
                    bin: true,
                    title: `${targetField} (Rangos)`
                },
                y: {
                    aggregate: "count",
                    title: "Frecuencia"
                },
                color: { value: "#1f77b4" }
            },
            config: {
                view: { stroke: "transparent" }
            }
        };

        setSpec(baseSpec);
    }, [data, width, height, field]);

    if (!data || data.length === 0) return null;

    return (
        <div style={{ width: "100%", height: height }}>
            {spec && <VegaLite spec={spec} actions={false} style={{ width: '100%' }} />}
        </div>
    );
};

export default HistogramChart;
