import React from 'react';
import { VegaLite } from 'react-vega';

const VegaChart = ({ spec, height = 300 }) => {
    // Debug logging
    console.log("🎨 [VegaChart] Rendering chart with spec:", spec);
    console.log("🎨 [VegaChart] Data points:", spec?.data?.values?.length || 0);

    // Validate spec
    if (!spec || !spec.data || !spec.data.values) {
        console.error("❌ [VegaChart] Invalid spec - missing data.values");
        return <div className="text-danger p-3">Error: Spec inválido (falta data.values)</div>;
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
