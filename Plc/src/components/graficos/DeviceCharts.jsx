import React, { useMemo, useRef, useState, useEffect } from 'react';
import { CCard, CCardBody, CCardHeader, CButton, CSpinner } from '@coreui/react-pro';
import { VegaLite } from 'react-vega';
import DeviceChartsService from '../../service/charts/DeviceChartsService';
import AdcRealtimeChartVega from './AdcRealtimeChartVega';

const DeviceCharts = ({ data = [], autoLoad = true, highlightedTimestamp = null }) => {
    // Transform data for Vega
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return { table: [] };

        return {
            table: data.map(d => ({
                ...d,
                timestamp: new Date(d.timestamp), // Ensure Date objects
                voltage: +d.voltaje || +d.voltage,
                deviceUid: d.deviceUid || d.deviceId || 'Unknown',
                anomalyLabel: d.isAnomaly ? 'Anomalía' : 'Normal'
            }))
        };
    }, [data]);

    // calculate stats for display
    const stats = useMemo(() => {
        if (!data || data.length === 0) return null;
        const total = data.length;
        const anomalies = data.filter(d => d.isAnomaly).length;

        const voltages = data.map(d => +d.voltaje || +d.voltage).filter(v => !isNaN(v));
        if (voltages.length === 0) return { total, normal: total - anomalies, anomalies, mean: 0, stdDev: 0 };

        const mean = voltages.reduce((a, b) => a + b, 0) / voltages.length;
        const varSum = voltages.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);
        const stdDev = Math.sqrt(varSum / voltages.length) || 0.01;

        return {
            total,
            normal: total - anomalies,
            anomalies,
            mean,
            stdDev
        };
    }, [data]);

    // RESIZE LOGIC
    const chartRef = useRef(null);
    const [chartWidth, setChartWidth] = useState(0);

    useEffect(() => {
        const resizeObserver = new ResizeObserver(entries => {
            if (entries[0]) {
                setChartWidth(entries[0].contentRect.width);
            }
        });
        if (chartRef.current) resizeObserver.observe(chartRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Vega-Lite Spec for Time Series (Composite replacement)
    const timeSeriesSpec = useMemo(() => {
        const layers = [
            {
                width: chartWidth > 0 ? chartWidth - 40 : 'container',
                height: 250,
                mark: { type: 'line', interpolate: 'monotone', clip: true },
                encoding: {
                    x: {
                        field: 'timestamp',
                        type: 'temporal',
                        scale: { domain: { selection: 'brush' } },
                        axis: { title: '', format: '%H:%M:%S' }
                    },
                    y: {
                        field: 'voltage',
                        type: 'quantitative',
                        scale: { zero: false },
                        title: 'Voltaje'
                    },
                    color: { value: '#0d6efd' },
                    tooltip: [
                        { field: 'timestamp', type: 'temporal', title: 'Tiempo', format: '%H:%M:%S' },
                        { field: 'voltage', type: 'quantitative', title: 'Voltaje' },
                        { field: 'deviceUid', type: 'nominal', title: 'Dispositivo' }
                    ]
                }
            }
        ];

        // Add highlight rule if exists
        if (highlightedTimestamp) {
            layers.push({
                mark: { type: 'rule', color: '#ffc107', strokeWidth: 2, strokeDash: [4, 2], clip: true },
                encoding: {
                    x: {
                        datum: new Date(highlightedTimestamp).getTime(),
                        type: 'temporal'
                    }
                }
            });
        }

        return {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            width: chartWidth > 0 ? chartWidth - 10 : 'container',
            autosize: { type: 'fit', contains: 'padding' },
            data: { name: 'table' },
            vconcat: [
                {
                    layer: layers
                },
                {
                    width: chartWidth > 0 ? chartWidth - 40 : 'container',
                    height: 60,
                    mark: { type: 'area', interpolate: 'monotone', color: '#e9ecef' },
                    encoding: {
                        x: {
                            field: 'timestamp',
                            type: 'temporal',
                            axis: { format: '%H:%M', title: 'Rango de Tiempo' }
                        },
                        y: {
                            field: 'voltage',
                            type: 'quantitative',
                            axis: null
                        }
                    },
                    selection: {
                        brush: { type: 'interval', encodings: ['x'] }
                    }
                }
            ]
        };
    }, [chartWidth, highlightedTimestamp]);

    // Vega-Lite Spec for Distribution (Gaussian/Density replacement)
    const distributionSpec = useMemo(() => {
        if (!stats) return {};

        const { mean, stdDev } = stats;

        return {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            width: 'container',
            height: 160,
            autosize: { type: 'fit', contains: 'padding' },
            layer: [
                // 1. DATA HISTOGRAM
                {
                    data: { name: 'table' },
                    mark: { type: 'bar', opacity: 0.2, color: '#6c757d' },
                    encoding: {
                        x: {
                            field: 'voltage',
                            type: 'quantitative',
                            bin: { maxbins: 30 },
                            title: 'Voltaje (V)'
                        },
                        y: {
                            aggregate: 'count',
                            type: 'quantitative',
                            axis: null // Hide frequency axis to avoid confusion with density
                        }
                    }
                },
                // 2. KDE DENSITY AREA
                {
                    data: { name: 'table' },
                    transform: [
                        {
                            density: 'voltage',
                            steps: 100
                        }
                    ],
                    mark: { type: 'area', color: '#0d6efd', opacity: 0.3 },
                    encoding: {
                        x: {
                            field: 'value',
                            type: 'quantitative'
                        },
                        y: {
                            field: 'density',
                            type: 'quantitative',
                            title: 'Densidad',
                            axis: { title: 'Probabilidad' }
                        }
                    }
                },
                // 3. THEORETICAL GAUSSIAN CURVE
                {
                    data: {
                        sequence: {
                            start: mean - 4 * stdDev,
                            stop: mean + 4 * stdDev,
                            step: (8 * stdDev) / 100,
                            as: 'v'
                        }
                    },
                    transform: [
                        {
                            calculate: `(1 / (${stdDev} * sqrt(2 * PI))) * exp(-pow(datum.v - ${mean}, 2) / (2 * pow(${stdDev}, 2)))`,
                            as: 'prob'
                        }
                    ],
                    mark: { type: 'line', color: '#dc3545', strokeWidth: 2, strokeDash: [4, 4] },
                    encoding: {
                        x: { field: 'v', type: 'quantitative' },
                        y: { field: 'prob', type: 'quantitative' }
                    }
                }
            ],
            view: { stroke: null }
        };
    }, [stats]);

    if (!data && autoLoad) return <CSpinner color="primary" />;

    return (
        <div className="device-charts-container w-100 h-100" style={{ display: 'grid', gridTemplateRows: '50% 50%', gap: '10px' }}>
            {/* 1. TOP ROW: Time Series (50% Height) */}
            <div className="w-100 h-100 overflow-hidden">
                <CCard className="h-100 border-0 shadow-sm">
                    <CCardHeader className="p-1 bg-light border-0 d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-2">
                            <strong>📈 Serie Temporal</strong>
                            {stats && (
                                <div className="d-flex gap-2 small ms-2 border-start ps-2 border-secondary">
                                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>Total: <b>{stats.total}</b></span>
                                    <span className="text-success" style={{ fontSize: '0.8rem' }}>OK: <b>{stats.normal}</b></span>
                                    <span className="text-danger" style={{ fontSize: '0.8rem' }}>⚠ <b>{stats.anomalies}</b></span>
                                </div>
                            )}
                        </div>
                    </CCardHeader>
                    <CCardBody
                        ref={chartRef}
                        className="p-0"
                        style={{ display: 'block', width: '95%', height: '100%', overflow: 'hidden' }}
                    >
                        {chartWidth > 0 && (
                            <VegaLite spec={timeSeriesSpec} data={chartData} actions={false} style={{ width: '100%', height: '100%' }} />
                        )}
                    </CCardBody>
                </CCard>
            </div>

            {/* 2. BOTTOM ROW: Distribution & Realtime (50% Height) */}
            <div className="w-100 h-100 overflow-hidden" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* Distribution Pie Chart */}
                <div className="h-100">
                    <CCard className="h-100 border-0 shadow-sm">
                        <CCardHeader className="p-1 bg-light border-0">
                            <strong>📊 Distribución (Gaussiana)</strong>
                        </CCardHeader>
                        <CCardBody className="p-0 d-flex justify-content-center align-items-center">
                            <VegaLite spec={distributionSpec} data={chartData} actions={false} style={{ width: '100%' }} />
                        </CCardBody>
                    </CCard>
                </div>

                {/* Realtime Signal Chart */}
                <div className="h-100">
                    <CCard className="h-100 border-0 shadow-sm">
                        <CCardHeader className="p-1 bg-light border-0">
                            <strong>🔴 Señal en Tiempo Real</strong>
                        </CCardHeader>
                        <CCardBody className="p-0 d-flex flex-column justify-content-center">
                            <AdcRealtimeChartVega
                                data={chartData.table} // Vega expects data array
                                compact={true}
                                height={160}
                            />
                        </CCardBody>
                    </CCard>
                </div>
            </div>
        </div>
    );
};

export default DeviceCharts;
