import React from 'react';
import { VegaLite } from 'react-vega';

/**
 * Component to visualize training evolution (loss per epoch)
 * @param {Array} trainingHistory - Array of {epoch, loss} objects
 */
const ModelEvolutionChart = ({ trainingHistory }) => {
    if (!trainingHistory || trainingHistory.length === 0) {
        return (
            <div className="d-flex justify-content-center align-items-center p-3">
                <small className="text-muted">No hay datos de entrenamiento disponibles</small>
            </div>
        );
    }

    // Parse JSON if it's a string
    const history = typeof trainingHistory === 'string'
        ? JSON.parse(trainingHistory)
        : trainingHistory;

    // Vega-Lite specification for line chart
    const spec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        description: 'Training Loss Evolution',
        width: 'container',
        height: 200,
        data: { values: history },
        mark: {
            type: 'line',
            point: true,
            tooltip: true
        },
        encoding: {
            x: {
                field: 'epoch',
                type: 'quantitative',
                title: 'Época',
                axis: { grid: false }
            },
            y: {
                field: 'loss',
                type: 'quantitative',
                title: 'Loss (MSE)',
                scale: { zero: false }
            },
            tooltip: [
                { field: 'epoch', type: 'quantitative', title: 'Época' },
                { field: 'loss', type: 'quantitative', title: 'Loss', format: '.6f' }
            ]
        },
        config: {
            axis: {
                labelFontSize: 11,
                titleFontSize: 12
            }
        }
    };

    return (
        <div className="w-100">
            <VegaLite spec={spec} actions={false} />
            <div className="mt-2 text-center">
                <small className="text-muted">
                    Loss final: <strong>{history[history.length - 1]?.loss.toFixed(6)}</strong>
                </small>
            </div>
        </div>
    );
};

export default ModelEvolutionChart;
