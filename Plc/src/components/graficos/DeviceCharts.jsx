import React, { useMemo, useRef, useState, useEffect } from 'react';
import { CCard, CCardBody, CCardHeader, CSpinner } from '@coreui/react-pro';
import { VegaLite } from 'react-vega';
import AdcRealtimeChartVega from './AdcRealtimeChartVega';
import BeeswarmChart from './BeeswarmChart';

const DeviceCharts = ({ data = [], autoLoad = true, highlightedTimestamp = null, selectedAnomalyIds = [] }) => {
    // Transform data for Vega
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return { table: [] };

        return {
            table: data
                .filter(d => (d.voltaje !== undefined || d.voltage !== undefined))
                .map(d => {
                    const v = d.voltage !== undefined ? d.voltage : d.voltaje;
                    return {
                        ...d,
                        timestamp: new Date(d.timestamp),
                        voltage: isNaN(+v) ? 0 : +v, // Ensure numeric value
                        loss: d.loss !== undefined ? +d.loss : 0, // Ensure numeric loss
                        deviceUid: d.device_uid || d.deviceUid || d.deviceId || 'Unknown',
                        anomalyLabel: d.isAnomaly ? 'Anomalía' : 'Normal',
                        isSelected: selectedAnomalyIds.includes(d.id || d.prueba)
                    };
                })
        };
    }, [data, selectedAnomalyIds]);

    // calculate stats for display
    const stats = useMemo(() => {
        if (!data || data.length === 0) return null;
        const total = data.length;
        const anomalies = data.filter(d => d.isAnomaly).length;
        const voltages = data.map(d => +d.voltaje || +d.voltage).filter(v => !isNaN(v));

        let mean = 0, stdDev = 0;
        if (voltages.length > 0) {
            mean = voltages.reduce((a, b) => a + b, 0) / voltages.length;
            const varSum = voltages.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);
            stdDev = Math.sqrt(varSum / voltages.length) || 0.01;
        }

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
            // Base line layer
            {
                width: chartWidth > 0 ? chartWidth - 40 : 'container',
                height: 250,
                mark: { type: 'line', interpolate: 'monotone', clip: true },
                encoding: {
                    x: {
                        field: 'timestamp',
                        type: 'temporal',
                        scale: { domain: { param: 'brush' } }, // Bind to brush parameter
                        axis: { title: '', format: '%H:%M:%S' }
                    },
                    y: {
                        field: 'voltage',
                        type: 'quantitative',
                        scale: { zero: false },
                        title: 'Voltaje'
                    },
                    color: { value: '#0d6efd' }
                }
            },
            // points layer
            {
                mark: { type: 'point', filled: true, opacity: 0.8, clip: true },
                encoding: {
                    x: {
                        field: 'timestamp',
                        type: 'temporal',
                        scale: { domain: { param: 'brush' } } // Bind to brush parameter
                    },
                    y: { field: 'voltage', type: 'quantitative' },
                    color: {
                        condition: [
                            { test: 'datum.isSelected', value: '#ffc107' }, // Selected highlight (yellow)
                            { test: 'datum.isAnomaly', value: '#dc3545' } // Normal anomaly (red)
                        ],
                        value: '#0d6efd' // Normal point (blue)
                    },
                    size: {
                        condition: { test: 'datum.isSelected', value: 100 },
                        value: 30
                    },
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
                        type: 'temporal',
                        scale: { domain: { param: 'brush' } } // Bind rule to brush parameter
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
                    params: [
                        {
                            name: 'brush',
                            select: { type: 'interval', encodings: ['x'] }
                        }
                    ]
                }
            ]
        };
    }, [chartWidth, highlightedTimestamp, selectedAnomalyIds]);

    // Vega-Lite Spec for Distribution (Gaussian/Density refined)
    const distributionSpec = useMemo(() => {
        if (!stats) return null;

        const { mean, stdDev } = stats;

        return {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            width: 'container',
            height: 100, // Reduced height for split view
            autosize: { type: 'fit', contains: 'padding' },
            layer: [
                // 1. DATA HISTOGRAM (Frequency Axis - Left)
                {
                    data: { name: 'table' },
                    mark: { type: 'bar', opacity: 0.4, color: '#6c757d', stroke: '#495057' },
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
                            title: 'Freq',
                            axis: { titleColor: '#6c757d' }
                        }
                    }
                },
                // 2. KDE DENSITY AREA (Density Axis - Right)
                {
                    data: { name: 'table' },
                    transform: [
                        {
                            density: 'voltage',
                            steps: 100
                        }
                    ],
                    mark: { type: 'area', color: '#0d6efd', opacity: 0.25 },
                    encoding: {
                        x: {
                            field: 'value',
                            type: 'quantitative'
                        },
                        y: {
                            field: 'density',
                            type: 'quantitative',
                            title: 'Dens',
                            axis: { orient: 'right', titleColor: '#0d6efd' }
                        }
                    }
                },
                // 3. THEORETICAL GAUSSIAN CURVE (Density Axis - Right)
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
                        y: {
                            field: 'prob',
                            type: 'quantitative',
                            axis: { orient: 'right' } // Shared with KDE
                        }
                    }
                }
            ],
            resolve: {
                scale: { y: 'independent' }
            },
            view: { stroke: null }
        };
    }, [stats]);

    if (!data && autoLoad) return <CSpinner color="primary" />;

    // Prepare data for Beeswarm (Non-cumulative, just current packet/point)
    const recentData = chartData.table.slice(-50);
    const lastPointData = chartData.table.slice(-1);

    const expandedBeeswarmData = useMemo(() => {
        // "Density of 20 per sample": Generate 20 points for single point to visualize "cloud"
        return lastPointData.flatMap(d => {
            return Array.from({ length: 20 }).map((_, i) => ({
                ...d,
                // Use LOSS mapped to VALUE for Beeswarm
                // Add tiny jitter for loss (values are small, e.g. 0.02)
                value: (d.loss !== undefined ? d.loss : 0) + (Math.random() - 0.5) * 0.002,
                id: `${d.id}_${i}` // Unique ID for D3
            }));
        });
    }, [lastPointData]);

    return (
        <div className="device-charts-container w-100 h-100" style={{ display: 'grid', gridTemplateRows: '50% 50%', gap: '10px' }}>
            {/* 1. TOP ROW: Time Series (50% Height) */}
            <div className="w-100 h-100 overflow-hidden">
                <CCard className="h-100 border-0 shadow-sm">
                    <CCardHeader className="p-1 bg-light border-0 d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-2">
                            <strong>📈 Serie Temporal</strong>
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

            {/* 2. BOTTOM ROW: Beeswarm (Left) + Split Realtime/Dist (Right) - (50% Height) */}
            <div className="w-100 h-100 overflow-hidden" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

                {/* LEFT CARD: Beeswarm (Dodge Penguins) */}
                <div className="h-100">
                    <CCard className="h-100 border-0 shadow-sm">
                        <CCardHeader className="p-1 bg-light border-0">
                            <strong>� Distribución (Dodge Penguins)</strong>
                        </CCardHeader>
                        <CCardBody className="p-0 d-flex justify-content-center align-items-center" style={{ overflow: 'hidden' }}>
                            <BeeswarmChart
                                data={expandedBeeswarmData}
                                width={chartWidth ? chartWidth / 2 : 400}
                                height={200}
                            />
                        </CCardBody>
                    </CCard>
                </div>

                {/* RIGHT CARD: Split View (Realtime + Normal Distribution) */}
                <div className="h-100">
                    <CCard className="h-100 border-0 shadow-sm">
                        <CCardHeader className="p-1 bg-light border-0 d-flex justify-content-between align-items-center">
                            <strong>� Señal + Distribución Normal</strong>
                            {stats && (
                                <div className="d-flex gap-2 small border-start ps-2 border-secondary">
                                    <span className="text-muted" style={{ fontSize: '0.66rem' }}>Total: <b>{stats.total}</b></span>
                                    <span className="text-danger" style={{ fontSize: '0.75rem' }}>⚠ <b>{stats.anomalies}</b></span>
                                </div>
                            )}
                        </CCardHeader>
                        <CCardBody className="p-0 d-flex flex-column" style={{ overflow: 'hidden' }}>
                            {/* TOP: Realtime Signal - Centered */}
                            <div style={{ flex: '1', borderBottom: '1px solid #eee', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <AdcRealtimeChartVega
                                    data={recentData} // Window of last 50 points
                                    compact={true}
                                    height={100}
                                />
                            </div>

                            {/* BOTTOM: Normal Distribution (Gaussian) - Centered */}
                            <div style={{ flex: '1', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {stats && stats.total > 1 ? (
                                    <VegaLite spec={distributionSpec} data={chartData} actions={false} style={{ width: '100%' }} />
                                ) : (
                                    <div className="text-muted small">Esperando datos...</div>
                                )}
                            </div>
                        </CCardBody>
                    </CCard>
                </div>
            </div>
        </div>
    );
};

export default DeviceCharts;
