import React, { useState } from 'react';
import {
    CCard,
    CCardBody,
    CCardHeader,
    CMultiSelect,
    CSpinner,
    CRow,
    CCol
} from "@coreui/react-pro";
import { useControl } from '../../hook/control/useControl';
import { useAnalysis } from '../../hook/analysis/useAnalysis';
import LiveTrainingMonitor from '../../components/analisis/LiveTrainingMonitor';
import TrainingConfigPanel from '../../components/analisis/TrainingConfigPanel';
import AnalisisTable from '../../components/analisis/AnalisisTable';

const Training = () => {
    const { devices } = useControl() || { devices: [] };
    const [selectedDevices, setSelectedDevices] = useState([]);

    // Use custom hook for data fetching
    const {
        trainedModels,
        loadingModels,
        fetchTrainedModels,
        activateModel,
        deleteModel
    } = useAnalysis(selectedDevices);

    // Transform devices to options for CMultiSelect
    const options = devices ? devices.map(dev => ({
        value: dev,
        label: dev && dev.length > 4 ? `...${dev.slice(-4)}` : dev,
        text: dev
    })) : [];

    const handleChange = (selectedOptions) => {
        const values = selectedOptions.map(opt => opt.value);
        setSelectedDevices(values);

        // Fetch models for the first selected device immediately
        if (values.length > 0) {
            fetchTrainedModels(values[0]);
        }
    };

    const handleActivateModel = async (modelId) => {
        await activateModel(modelId);
    };

    // Trigger initial fetch on mount (mimicking tab click behavior)
    React.useEffect(() => {
        fetchTrainedModels();
    }, [fetchTrainedModels]);


    return (
        <div className="p-1" style={{ height: '88vh' }}>
            <CCard className="h-100 shadow-sm">
                <CCardHeader className="bg-light d-flex justify-content-between align-items-center py-2">
                    <h5 className="mb-0 text-secondary" style={{ fontSize: '1rem', whiteSpace: 'nowrap', marginRight: '10px' }}>🤖 Entrenamiento de Modelos IA</h5>

                    <div style={{ minWidth: '200px', flexGrow: 1, maxWidth: '300px' }}>
                        <CMultiSelect
                            options={options}
                            onChange={handleChange}
                            placeholder="Seleccionar dispositivo"
                            selectionType="tags"
                            optionsStyle="checkbox"
                            className="bg-white"
                        />
                    </div>
                </CCardHeader>
                <CCardBody className="p-3 d-flex flex-column text-muted overflow-auto">
                    {/* Training Configuration and Models Table - Side by Side */}
                    <CRow>
                        <CCol lg={6} className="mb-3 mb-lg-0">
                            {/* Pass selected device if needed, defaulting to first selected or null */}
                            <TrainingConfigPanel deviceUid={selectedDevices.length > 0 ? selectedDevices[0] : null} />
                        </CCol>
                        <CCol lg={6}>
                            <CCard className="h-100">
                                <CCardHeader className="bg-light py-2">
                                    <strong>Modelos Entrenados</strong>
                                </CCardHeader>
                                <CCardBody className="p-2">
                                    {loadingModels ? (
                                        <div className="d-flex flex-column justify-content-center align-items-center py-5">
                                            <CSpinner color="primary" />
                                            <small className="mt-2">Cargando modelos...</small>
                                        </div>
                                    ) : trainedModels.length > 0 ? (
                                        <AnalisisTable
                                            models={trainedModels}
                                            onActivate={handleActivateModel}
                                            onDelete={deleteModel}
                                        />
                                    ) : (
                                        <div className="d-flex flex-column justify-content-center align-items-center py-5">
                                            <p className="mb-1">No hay modelos entrenados disponibles.</p>
                                            <small>Configura e inicia un entrenamiento arriba.</small>
                                        </div>
                                    )}
                                </CCardBody>
                            </CCard>
                        </CCol>
                    </CRow>
                </CCardBody>
            </CCard>
        </div>
    );
};

export default Training;
