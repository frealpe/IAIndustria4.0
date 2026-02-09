import React, { useState } from 'react';
import {
    CCard,
    CCardBody,
    CCardHeader,
    CForm,
    CFormInput,
    CFormLabel,
    CButton,
    CRow,
    CCol,
    CAlert
} from '@coreui/react-pro';
import ControlService from '../../service/control/control.service';
import LiveTrainingMonitor from './LiveTrainingMonitor';

/**
 * Component to configure and manually trigger model training
 */
const TrainingConfigPanel = ({ deviceUid }) => {
    const [maxSamples, setMaxSamples] = useState(20);
    const [batchesRequired, setBatchesRequired] = useState(30);
    const [isTraining, setIsTraining] = useState(false);
    const [message, setMessage] = useState(null);

    const handleTrain = async () => {
        if (!deviceUid) {
            setMessage({ type: 'danger', text: 'Selecciona un dispositivo primero' });
            return;
        }

        setIsTraining(true);
        setMessage({ type: 'info', text: 'Iniciando entrenamiento...' });

        try {
            const response = await ControlService.startManualTraining({
                device_uid: deviceUid,
                max_samples: parseInt(maxSamples),
                batches_required: parseInt(batchesRequired)
            });

            setMessage({
                type: 'success',
                text: `✅ Entrenamiento iniciado con éxito. Se usarán ${maxSamples} muestras × ${batchesRequired} lotes = ${maxSamples * batchesRequired} datos totales.`
            });
        } catch (error) {
            console.error('Error al iniciar entrenamiento:', error);
            setMessage({
                type: 'danger',
                text: `❌ Error: ${error.response?.data?.msg || error.message}`
            });
        } finally {
            setIsTraining(false);
        }
    };

    return (
        <CCard className="h-100">
            <CCardHeader className="bg-primary text-white py-2">
                <strong>⚙️ Configuración de Entrenamiento</strong>
            </CCardHeader>
            <CCardBody className="py-2">
                {message && (
                    <CAlert color={message.type} dismissible onClose={() => setMessage(null)} className="py-1 mb-2">
                        <small>{message.text}</small>
                    </CAlert>
                )}

                <CForm>
                    <CRow className="mb-2 align-items-end">
                        <CCol md={3}>
                            <CFormLabel htmlFor="maxSamples" className="mb-1">
                                <small><strong>Muestras/lote</strong></small>
                            </CFormLabel>
                            <CFormInput
                                type="number"
                                id="maxSamples"
                                value={maxSamples}
                                onChange={(e) => setMaxSamples(e.target.value)}
                                min="1"
                                max="100"
                                disabled={isTraining}
                                size="sm"
                            />
                        </CCol>

                        <CCol md={3}>
                            <CFormLabel htmlFor="batchesRequired" className="mb-1">
                                <small><strong>Lotes</strong></small>
                            </CFormLabel>
                            <CFormInput
                                type="number"
                                id="batchesRequired"
                                value={batchesRequired}
                                onChange={(e) => setBatchesRequired(e.target.value)}
                                min="1"
                                max="100"
                                disabled={isTraining}
                                size="sm"
                            />
                        </CCol>

                        <CCol md={3}>
                            <div className="px-2 py-1 bg-light rounded text-center">
                                <small className="text-muted d-block">Total</small>
                                <strong>{maxSamples * batchesRequired}</strong>
                            </div>
                        </CCol>

                        <CCol md={3}>
                            <CButton
                                color="success"
                                onClick={handleTrain}
                                disabled={isTraining || !deviceUid}
                                size="sm"
                                className="w-100"
                            >
                                {isTraining ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-1" />
                                        <small>Entrenando...</small>
                                    </>
                                ) : (
                                    <small>🚀 Entrenar</small>
                                )}
                            </CButton>
                        </CCol>
                    </CRow>


                    {!deviceUid && (
                        <small className="text-danger d-block mt-2">
                            * Debes seleccionar un dispositivo en el filtro superior
                        </small>
                    )}
                </CForm>

                {/* Training Monitor */}
                <div className="mt-3">
                    <LiveTrainingMonitor />
                </div>
            </CCardBody>
        </CCard>
    );
};

export default TrainingConfigPanel;
