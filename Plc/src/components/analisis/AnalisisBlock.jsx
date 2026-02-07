import React, { useState, useEffect } from 'react';
import {
    CCard,
    CCardBody,
    CCardHeader,
    CMultiSelect,
    CSpinner,
    CTabs,
    CTabList,
    CTab,
    CTabContent,
    CTabPanel,
    CRow,
    CCol
} from "@coreui/react-pro";
import { useControl } from '../../hook/control/useControl';
import { useAnalysis } from '../../hook/analysis/useAnalysis';
import AnalisisChart from './AnalisisChart';
import LiveTrainingMonitor from './LiveTrainingMonitor';
import TrainingConfigPanel from './TrainingConfigPanel';
import AnalisisTable from './AnalisisTable';

const AnalisisBlock = ({ data, agentStats }) => {
    const { devices } = useControl() || { devices: [] };
    const [selectedDevices, setSelectedDevices] = useState([]);

    // Use custom hook for all data fetching
    const {
        logs,
        loading,
        trainedModels,
        loadingModels,
        fetchTrainedModels,
        activateModel
    } = useAnalysis(selectedDevices);

    // Transformar dispositivos a opciones para CMultiSelect
    const options = devices ? devices.map(dev => ({
        value: dev,
        label: dev && dev.length > 4 ? `...${dev.slice(-4)}` : dev,
        text: dev
    })) : [];

    const handleChange = (selectedOptions) => {
        const values = selectedOptions.map(opt => opt.value);
        setSelectedDevices(values);
    };

    // Activate a model (now using hook's method)
    const handleActivateModel = async (modelId) => {
        await activateModel(modelId);
    };

    return (
        <CCard className="h-100 shadow-sm">
            <CCardHeader className="bg-light d-flex justify-content-between align-items-center py-2">
                <h5 className="mb-0 text-secondary" style={{ fontSize: '1rem', whiteSpace: 'nowrap', marginRight: '10px' }}>🧠 Análisis Estadístico</h5>

                <div style={{ minWidth: '200px', flexGrow: 1, maxWidth: '300px' }}>
                    <CMultiSelect
                        options={options}
                        onChange={handleChange}
                        placeholder="Seleccionar dispositivos"
                        selectionType="tags"
                        optionsStyle="checkbox"
                        className="bg-white"
                    />
                </div>
            </CCardHeader>
            <CCardBody className="d-flex flex-column text-muted p-2 overflow-hidden">
                <CTabs activeItemKey={1}>
                    <CTabList variant="underline-border">
                        <CTab itemKey={1}>📊 Análisis</CTab>
                        <CTab itemKey={2} onClick={fetchTrainedModels}>🤖 Entrenamiento del Modelo</CTab>
                    </CTabList>
                    <CTabContent>
                        <CTabPanel className="p-3" itemKey={1}>
                            {loading ? (
                                <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                    <CSpinner color="primary" variant="grow" />
                                    <small className="mt-2">Cargando histórico...</small>
                                </div>
                            ) : logs.length > 0 ? (
                                <div className="w-100 h-100">
                                    <AnalisisChart logs={logs} />
                                </div>
                            ) : (
                                <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                    <h5>🧠 Vista de Análisis</h5>
                                    <p className="mb-1">Selecciona uno o más dispositivos arriba.</p>
                                    <small>Se mostrará la gráfica de dispersión con detección de anomalías.</small>
                                </div>
                            )}
                        </CTabPanel>
                        <CTabPanel className="p-3" itemKey={2}>
                            {/* Training Configuration and Monitor - Side by Side */}
                            <CRow className="mb-3">
                                <CCol lg={6} className="mb-3 mb-lg-0">
                                    <TrainingConfigPanel deviceUid={selectedDevices[0]} />
                                </CCol>
                                <CCol lg={6}>
                                    <LiveTrainingMonitor />
                                </CCol>
                            </CRow>

                            {loadingModels ? (
                                <div className="d-flex flex-column justify-content-center align-items-center">
                                    <CSpinner color="primary" />
                                    <small className="mt-2">Cargando modelos...</small>
                                </div>
                            ) : trainedModels.length > 0 ? (
                                <AnalisisTable
                                    models={trainedModels}
                                    onActivate={handleActivateModel}
                                />
                            ) : (
                                <div className="d-flex flex-column justify-content-center align-items-center h-100">
                                    <h5>🤖 Historial de Entrenamiento</h5>
                                    <p className="mb-1">No hay modelos entrenados aún.</p>
                                    <small>Los modelos aparecerán aquí después del entrenamiento inicial.</small>
                                </div>
                            )}
                        </CTabPanel>
                    </CTabContent>
                </CTabs>
            </CCardBody>
        </CCard>
    );
};

export default AnalisisBlock;
