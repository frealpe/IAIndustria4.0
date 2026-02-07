import React, { useEffect, useState } from "react";
import { VegaLite } from "react-vega";

const StripPlotChart = ({ data = [], width = "container", height = 180, xField = "tiempo", yField = "voltaje" }) => {
    const [spec, setSpec] = useState(null);

    useEffect(() => {
        if (!data || data.length === 0) {
            setSpec(null);
            return;
        }

        // Robust Field Detection
        const keys = Object.keys(data[0]);
        const xCandidate = keys.find(k => /tiempo|time|date|fecha|id/i.test(k)) || keys[0];
        const yCandidate = keys.find(k => k !== xCandidate && /voltaje|voltage|value|valor/i.test(k));
        const finalY = yCandidate || keys.find(k => typeof data[0][k] === 'number');
        const finalX = xCandidate;

        const baseSpec = {
            width: width === "container" ? "container" : width,
            height: height,
            autosize: { type: "fit", contains: "padding" },
            data: { values: data },
            mark: "tick", // Strip plot uses 'tick' mark
            encoding: {
                x: { field: finalX, type: "ordinal", title: finalX }, // Categorical/Ordinal axis
                y: { field: finalY, type: "quantitative", title: finalY }, // Value axis
                color: { value: "#ff7f0e" }
            },
            config: {
                view: { stroke: "transparent" },
                tick: { thickness: 2 }
            }
        };

        setSpec(baseSpec);
    }, [data, width, height, xField, yField]);

    if (!data || data.length === 0) return null;

    return (
        <div style={{ width: "100%", height: height }}>
            {spec && <VegaLite spec={spec} actions={false} style={{ width: '100%' }} />}
        </div>
    );
};

export default StripPlotChart;
