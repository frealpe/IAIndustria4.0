import React, { useState, useEffect, useContext } from 'react';
import { CCard, CCardBody, CCardHeader, CProgress } from '@coreui/react-pro';
import { SocketContext } from '../../context/SocketContext';
import { VegaLite } from 'react-vega';

/**
 * Component to show real-time training progress
 */
const LiveTrainingMonitor = () => {
    const { socket } = useContext(SocketContext) || {};
    const [isTraining, setIsTraining] = useState(false);
    const [trainingData, setTrainingData] = useState({
        device_uid: null,
        current_epoch: 0,
        total_epochs: 50,
        history: [],
        final_loss: null
    });

    useEffect(() => {
        if (!socket) return;

        // Listen for training events
        socket.on('training:started', (data) => {
            console.log('🚀 Training started:', data);
            setIsTraining(true);
            setTrainingData({
                device_uid: data.device_uid,
                current_epoch: 0,
                total_epochs: data.total_epochs,
                history: [],
                final_loss: null
            });
        });

        socket.on('training:progress', (data) => {
            console.log('📈 [Frontend] Progress:', data.epoch, 'Loss:', data.loss);
            setTrainingData(prev => ({
                ...prev,
                current_epoch: data.epoch,
                history: data.history
            }));
        });

        socket.on('training:completed', (data) => {
            console.log('✅ Training completed:', data);
            setTrainingData(prev => ({
                ...prev,
                final_loss: data.final_loss
            }));
            setTimeout(() => setIsTraining(false), 3000); // Keep visible for 3s
        });

        return () => {
            socket.off('training:started');
            socket.off('training:progress');
            socket.off('training:completed');
        };
    }, [socket]);

    // Always show the component, even if no training yet (for debugging)
    const showChart = trainingData.history.length > 0;
    const progress = trainingData.total_epochs > 0
        ? (trainingData.current_epoch / trainingData.total_epochs) * 100
        : 0;

    // Vega-Lite spec for live training chart
    const spec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        width: 'container',
        height: 200,
        data: { name: 'training' }, // Named data source for reactive updates
        mark: {
            type: 'line',
            point: true,
            tooltip: true,
            color: '#321fdb'
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
        }
    };

    return (
        <CCard className="shadow-sm mb-3">
            <CCardHeader className="bg-info text-white">
                <div className="d-flex justify-content-between align-items-center">
                    <strong>
                        {isTraining ? '🔄 Entrenamiento en Progreso' : showChart ? '✅ Entrenamiento Completado' : '⏳ Esperando Entrenamiento'}
                    </strong>
                    {trainingData.device_uid && (
                        <small>
                            Dispositivo: <code>{trainingData.device_uid?.slice(-8)}</code>
                        </small>
                    )}
                </div>
            </CCardHeader>
            <CCardBody>
                <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                        <span>Época {trainingData.current_epoch} de {trainingData.total_epochs}</span>
                        <span>{progress.toFixed(0)}%</span>
                    </div>
                    <CProgress
                        value={progress}
                        color="info"
                        animated={isTraining}
                        className="mb-3"
                    />
                </div>

                {trainingData.final_loss !== null && (
                    <div className="mt-2 text-center">
                        <strong>Loss Final: {trainingData.final_loss.toFixed(6)}</strong>
                    </div>
                )}
            </CCardBody>
        </CCard>
    );
};

export default LiveTrainingMonitor;
