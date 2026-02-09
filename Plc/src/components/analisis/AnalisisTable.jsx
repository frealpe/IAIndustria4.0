import React, { useState } from 'react';
import {
    CTable,
    CTableHead,
    CTableBody,
    CTableRow,
    CTableHeaderCell,
    CTableDataCell,
    CBadge
} from "@coreui/react-pro";
import CIcon from '@coreui/icons-react';
import { cilChevronBottom, cilCheckAlt, cilTrash } from '@coreui/icons';
import ModelEvolutionChart from './ModelEvolutionChart';

const AnalisisTable = ({ models, onActivate, onDelete }) => {
    const [expandedDevices, setExpandedDevices] = useState(new Set());
    const [expandedModels, setExpandedModels] = useState(new Set());

    // Group models by device
    const groupedModels = React.useMemo(() => {
        const groups = {};
        models.forEach(model => {
            const dev = model.device_uid || 'Desconocido';
            if (!groups[dev]) groups[dev] = [];
            groups[dev].push(model);
        });
        return Object.entries(groups).map(([deviceUid, deviceModels]) => ({
            id: deviceUid,
            count: deviceModels.length,
            models: deviceModels,
            lastTraining: deviceModels.length > 0 ? deviceModels[0].trained_at : null
        }));
    }, [models]);

    // Toggle Device Row
    const toggleDevice = (deviceId) => {
        setExpandedDevices(prev => {
            const newSet = new Set(prev);
            if (newSet.has(deviceId)) newSet.delete(deviceId);
            else newSet.add(deviceId);
            return newSet;
        });
    };

    // Toggle Model Details Row
    const toggleModel = (modelId) => {
        setExpandedModels(prev => {
            const newSet = new Set(prev);
            if (newSet.has(modelId)) newSet.delete(modelId);
            else newSet.add(modelId);
            return newSet;
        });
    };

    return (
        <CTable hover responsive>
            <CTableHead>
                <CTableRow>
                    <CTableHeaderCell style={{ width: '30px' }}></CTableHeaderCell>
                    <CTableHeaderCell>Dispositivo</CTableHeaderCell>
                    <CTableHeaderCell>Total Modelos</CTableHeaderCell>
                    <CTableHeaderCell>Último Entrenamiento</CTableHeaderCell>
                </CTableRow>
            </CTableHead>
            <CTableBody>
                {groupedModels.length === 0 && (
                    <CTableRow>
                        <CTableDataCell colSpan="4" className="text-center text-muted">
                            No hay modelos disponibles
                        </CTableDataCell>
                    </CTableRow>
                )}

                {groupedModels.map(group => (
                    <React.Fragment key={group.id}>
                        <CTableRow
                            onClick={() => toggleDevice(group.id)}
                            style={{ cursor: 'pointer', backgroundColor: expandedDevices.has(group.id) ? '#f8f9fa' : 'transparent' }}
                        >
                            <CTableDataCell>
                                <CIcon
                                    icon={cilChevronBottom}
                                    style={{
                                        transform: expandedDevices.has(group.id) ? 'rotate(0deg)' : 'rotate(-90deg)',
                                        transition: 'transform 0.2s'
                                    }}
                                />
                            </CTableDataCell>
                            <CTableDataCell><strong>{group.id}</strong></CTableDataCell>
                            <CTableDataCell>
                                <CBadge color="info" shape="rounded-pill">{group.count}</CBadge>
                            </CTableDataCell>
                            <CTableDataCell>
                                {group.lastTraining ? new Date(group.lastTraining).toLocaleString('es-ES') : 'N/A'}
                            </CTableDataCell>
                        </CTableRow>

                        {/* EXPANDED DEVICE CONTENT: THE MODELS TABLE */}
                        {expandedDevices.has(group.id) && (
                            <CTableRow>
                                <CTableDataCell colSpan="6" className="p-3 bg-light">
                                    <CTable striped hover responsive className="mb-0 bg-white border">
                                        <CTableHead>
                                            <CTableRow>
                                                <CTableHeaderCell>Fecha Entrenamiento</CTableHeaderCell>
                                                <CTableHeaderCell>Muestras</CTableHeaderCell>
                                                <CTableHeaderCell>Lotes</CTableHeaderCell>
                                                <CTableHeaderCell>Loss</CTableHeaderCell>
                                                <CTableHeaderCell>Estado</CTableHeaderCell>
                                                <CTableHeaderCell>Acción</CTableHeaderCell>
                                            </CTableRow>
                                        </CTableHead>
                                        <CTableBody>
                                            {group.models.map(model => (
                                                <React.Fragment key={model.id}>
                                                    <CTableRow> {/* Removed onClick and style as models no longer expand */}
                                                        {/* Removed chevron icon data cell */}
                                                        <CTableDataCell>
                                                            {new Date(model.trained_at).toLocaleString('es-ES')}
                                                        </CTableDataCell>
                                                        <CTableDataCell>{model.samples_count}</CTableDataCell>
                                                        <CTableDataCell>{model.batches_count}</CTableDataCell>
                                                        <CTableDataCell>
                                                            {model.final_loss ? model.final_loss.toFixed(6) : 'N/A'}
                                                        </CTableDataCell>
                                                        <CTableDataCell>
                                                            {model.is_active ? (
                                                                <CBadge color="success">Activo</CBadge>
                                                            ) : (
                                                                <CBadge color="secondary">Inactivo</CBadge>
                                                            )}
                                                        </CTableDataCell>
                                                        <CTableDataCell onClick={(e) => e.stopPropagation()}>
                                                            <div className="d-flex gap-2">
                                                                {!model.is_active && (
                                                                    <CIcon
                                                                        icon={cilCheckAlt}
                                                                        size="lg"
                                                                        className="text-success"
                                                                        style={{ cursor: 'pointer' }}
                                                                        onClick={() => onActivate(model.id)}
                                                                        title="Activar modelo"
                                                                    />
                                                                )}
                                                                <CIcon
                                                                    icon={cilTrash}
                                                                    size="lg"
                                                                    className="text-danger"
                                                                    style={{ cursor: 'pointer' }}
                                                                    onClick={() => {
                                                                        if (window.confirm('¿Eliminar este modelo permanentemente?')) {
                                                                            onDelete(model.id);
                                                                        }
                                                                    }}
                                                                    title="Eliminar modelo"
                                                                />
                                                            </div>
                                                        </CTableDataCell>
                                                    </CTableRow>
                                                </React.Fragment>
                                            ))}
                                        </CTableBody>
                                    </CTable>
                                </CTableDataCell>
                            </CTableRow>
                        )}
                    </React.Fragment>
                ))}
            </CTableBody>
        </CTable >
    );
};

export default AnalisisTable;
