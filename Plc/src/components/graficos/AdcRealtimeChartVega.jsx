import React, { useMemo } from 'react';
import { VegaLite } from 'react-vega';

const AdcRealtimeChartVega = ({ data = [], height = 200, compact = false }) => {

    const spec = useMemo(() => ({
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        width: 'container',
        height: height,
        padding: compact ? 5 : 10,
        autosize: { type: 'fit', contains: 'padding' },
        data: { name: 'table' },
        layer: [
            {
                mark: {
                    type: 'line',
                    strokeWidth: 2,
                    interpolate: 'monotone',
                    color: '#d62728'
                },
                encoding: {
                    x: {
                        field: 'timestamp',
                        type: 'temporal',
                        axis: compact ? { ticks: false, labels: false, title: null } : { title: 'Tiempo' }
                    },
                    y: {
                        field: 'voltaje',
                        type: 'quantitative',
                        scale: { zero: false, padding: 0.1 },
                        axis: { title: compact ? null : 'Voltaje' }
                    }
                }
            },
            {
                mark: { type: 'point', filled: true },
                encoding: {
                    x: { field: 'timestamp', type: 'temporal' },
                    y: { field: 'voltaje', type: 'quantitative' },
                    color: {
                        condition: { test: "datum.isAnomaly === true", value: "#dc2626" },
                        value: "#2563eb"
                    },
                    size: {
                        condition: { test: "datum.isAnomaly === true", value: 60 },
                        value: 20
                    },
                    tooltip: [
                        { field: 'voltaje', type: 'quantitative', title: 'Voltaje' },
                        { field: 'timestamp', type: 'temporal', title: 'Tiempo', format: '%H:%M:%S' },
                        { field: 'isAnomaly', type: 'nominal', title: 'Anomalía' }
                    ]
                }
            }
        ]
    }), [height, compact]);

    const chartData = useMemo(() => {
        return {
            table: data
        };
    }, [data]);

    return (
        <div className="w-100 h-100">
            {!compact && <h6 className="text-center text-primary mb-2">Señal en Tiempo Real</h6>}
            <VegaLite spec={spec} data={chartData} actions={false} style={{ width: '100%' }} />
        </div>
    );
};

export default AdcRealtimeChartVega;
