import React from 'react';
import { VegaLite } from 'react-vega';

const VegaChart = ({ spec, height = 300 }) => {
    // Debug logging
    console.log("🎨 [VegaChart] Rendering chart with spec:", spec);
    console.log("🎨 [VegaChart] Data points:", spec?.data?.values?.length || 0);

    // Validate spec
    const hasData = spec?.data?.values && Array.isArray(spec.data.values) && spec.data.values.length > 0;

    if (!hasData) {
        console.warn("⚠️ [VegaChart] No data or invalid spec found:", spec);
        return (
            <div className="p-3 text-center border rounded bg-light">
                <p className="text-muted mb-0">Esperando datos para visualizar...</p>
                <small className="text-secondary">(No hay puntos de datos válidos en el spec)</small>
            </div>
        );
    }

    // Create spec with explicit numeric dimensions
    const responsiveSpec = {
        ...spec,
        width: 600,  // Fixed width instead of 'container'
        height: height
    };

    console.log("📐 [VegaChart] Responsive spec:", responsiveSpec);

    return (
        <div className="w-full bg-white p-2 rounded shadow-sm text-black" style={{ minHeight: `${height + 50}px` }}>
            <VegaLite
                spec={responsiveSpec}
                actions={{ export: true, source: false, compiled: false, editor: false }}
                onParseError={(err) => console.error("❌ [VegaLite] Parse Error:", err)}
                onError={(err) => console.error("❌ [VegaLite] Runtime Error:", err)}
            />
        </div>
    );
};

export default VegaChart;
