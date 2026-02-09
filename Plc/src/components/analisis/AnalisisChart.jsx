
import React, { useMemo } from 'react';
import { VegaLite } from 'react-vega';

const AnalisisChart = ({ logs, height = 300 }) => { // logs = array of Esp32_Log
    const chartData = useMemo(() => {
        console.log("AnalisisChart: Recibido logs:", logs);
        if (!logs || logs.length === 0) return [];

        // Logs vienen ordenados DESC (más nuevo primero). 
        // Para visualizarlos de izquierda (viejo) a derecha (nuevo), invertimos el orden.
        const reversedLogs = [...logs].reverse(); // Orden ASC

        const data = reversedLogs.map((log, index) => {
            console.log(`📊 Processing log ${index}:`, {
                id: log.id,
                device_uid: log.device_uid,
                created_at: log.created_at,
                mean: log.mean,
                resultado: log.resultado
            });

            let resultado = log.resultado;
            if (typeof resultado === 'string') {
                try { resultado = JSON.parse(resultado); }
                catch (e) {
                    console.error(`❌ Failed to parse resultado for log ${index}:`, e);
                    return null;
                }
            }
            if (!resultado) {
                console.warn(`⚠️ Log ${index}: resultado is null/undefined`);
                return null;
            }

            const isAnomaly = resultado.isAnomaly || false;
            // Ensure numbers are distinct from NaN
            const parseNum = (n) => {
                const pn = parseFloat(n);
                return isFinite(pn) ? pn : 0;
            };

            const lossVal = parseNum(resultado.loss);
            const thresholdVal = parseNum(resultado.threshold);

            // Handle missing 'mean' field - compute it from rawValues if needed
            let meanVal = parseNum(log.mean);
            if (!meanVal || !isFinite(meanVal)) {
                console.warn(`⚠️ Log ${index}: 'mean' is missing/invalid, trying to compute from rawValues`);
                if (resultado.rawValues && Array.isArray(resultado.rawValues) && resultado.rawValues.length > 0) {
                    const sum = resultado.rawValues.reduce((a, b) => a + b, 0);
                    meanVal = sum / resultado.rawValues.length;
                    console.log(`✅ Log ${index}: Computed mean = ${meanVal} from ${resultado.rawValues.length} raw values`);
                } else {
                    console.error(`❌ Log ${index}: Cannot compute mean - no rawValues available`);
                    meanVal = 0; // Fallback to 0
                }
            }

            // Force valid timestamp
            const ts = new Date(log.created_at).getTime();
            if (!ts || !isFinite(ts)) {
                console.warn(`⚠️ Log ${index}: Invalid timestamp from created_at:`, log.created_at);
                return null;
            }

            const processedItem = {
                id: log.id,
                timestamp: ts,
                loss: lossVal,
                mean: meanVal,
                threshold: thresholdVal,
                category: isAnomaly ? 'Anomalía' : 'Normal',
                color: isAnomaly ? 'red' : 'blue'  // Blue for normal, red for anomalies
            };

            console.log(`✅ Log ${index} processed successfully:`, processedItem);
            return processedItem;
        }).filter(item => item !== null);

        console.log("📊 AnalisisChart: Processed data:", data);
        if (data.length > 0) {
            console.log("📊 AnalisisChart: First processed item:", data[0]);
        } else {
            console.warn("⚠️ AnalisisChart: No data after processing!");
        }
        return data;
    }, [logs]);

    const spec = {
        width: 600,
        height: height,  // Use prop instead of hardcoded 300
        mark: "point", // Defines the default mark
        encoding: {
            x: {
                field: "timestamp",
                type: "temporal",
                title: "Tiempo",
                axis: { format: "%H:%M:%S" }
            },
            y: {
                field: "mean",
                type: "quantitative",
                title: "Valor Medio (ADC)",
                scale: { domain: [0, 4200] }
            },
            size: {
                field: "loss",
                type: "quantitative",
                title: "Severidad (Loss)",
                scale: { range: [50, 400] },
                legend: null
            },
            color: {
                field: "color",
                type: "nominal",
                scale: null,
                legend: { title: "Estado", values: ["red", "green"], labelExpr: "datum.value === 'red' ? 'Anomalía' : 'Normal'" }
            },
            tooltip: [
                { field: "timestamp", type: "temporal", title: "Fecha", format: "%Y-%m-%d %H:%M:%S" },
                { field: "id", type: "quantitative", title: "ID" },
                { field: "mean", type: "quantitative", title: "Media" },
                { field: "loss", type: "quantitative", title: "Loss" },
                { field: "category", type: "nominal", title: "Tipo" }
            ]
        },
        data: { name: "table" }
        // Layer removed for simplicity to verify basic point rendering first
    };

    if (!logs || logs.length === 0) return <div className="text-center p-3 text-muted">Sin datos para mostrar</div>;

    return (
        <div className="w-100 h-100 overflow-auto" style={{ minHeight: '350px' }}>
            {/* Debug info */}
            <div className="text-xs text-muted text-right mb-1">
                Pts: {chartData.length} | First Mean: {chartData[0]?.mean}
            </div>
            <div style={{ minWidth: '820px' }}>
                <VegaLite spec={spec} data={{ table: chartData }} actions={false} />
            </div>
        </div>
    );
};

export default AnalisisChart;
