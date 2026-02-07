import React from 'react';
import { VegaLite } from 'react-vega';

const VegaChart = ({ spec }) => {
    return (
        <div className="w-full h-full bg-white p-2 rounded shadow-sm text-black">
            <VegaLite spec={spec} actions={false} />
        </div>
    );
};

export default VegaChart;
