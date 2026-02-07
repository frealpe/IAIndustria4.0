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
import { cilChevronBottom, cilCheckAlt } from '@coreui/icons';
import ModelEvolutionChart from './ModelEvolutionChart';

const AnalisisTable = ({ models, onActivate }) => {
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Toggle row expansion
    const toggleRow = (modelId) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(modelId)) {
                newSet.delete(modelId);
            } else {
                newSet.add(modelId);
            }
            return newSet;
        });
    };

    return (
        <CTable striped hover responsive>
            <CTableHead>
                <CTableRow>
                    <CTableHeaderCell style={{ width: '30px' }}></CTableHeaderCell>
                    <CTableHeaderCell>Dispositivo</CTableHeaderCell>
                    <CTableHeaderCell>Entrenado</CTableHeaderCell>
                    <CTableHeaderCell>Muestras</CTableHeaderCell>
                    <CTableHeaderCell>Lotes</CTableHeaderCell>
                    <CTableHeaderCell>Loss</CTableHeaderCell>
                    <CTableHeaderCell>Estado</CTableHeaderCell>
                    <CTableHeaderCell>Acción</CTableHeaderCell>
                </CTableRow>
            </CTableHead>
            <CTableBody>
                {models.map(model => (
                    <React.Fragment key={model.id}>
                        <CTableRow
                            style={{ cursor: 'pointer' }}
                            onClick={() => toggleRow(model.id)}
                        >
                            <CTableDataCell>
                                <CIcon
                                    icon={cilChevronBottom}
                                    style={{
                                        transform: expandedRows.has(model.id) ? 'rotate(0deg)' : 'rotate(-90deg)',
                                        transition: 'transform 0.2s'
                                    }}
                                />
                            </CTableDataCell>
                            <CTableDataCell>
                                <code>{model.device_uid?.slice(-8) || 'N/A'}</code>
                            </CTableDataCell>
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
                                {!model.is_active && (
                                    <CIcon
                                        icon={cilCheckAlt}
                                        size="lg"
                                        style={{ cursor: 'pointer', color: '#28a745' }}
                                        onClick={() => onActivate(model.id)}
                                        title="Activar modelo"
                                    />
                                )}
                            </CTableDataCell>
                        </CTableRow>
                        {expandedRows.has(model.id) && (
                            <CTableRow>
                                <CTableDataCell colSpan="8" className="bg-light">
                                    <div className="p-3">
                                        <h6>📈 Evolución del Entrenamiento</h6>
                                        {model.training_history ? (
                                            <ModelEvolutionChart trainingHistory={model.training_history} />
                                        ) : (
                                            <small className="text-muted">No hay datos de entrenamiento disponibles</small>
                                        )}
                                    </div>
                                </CTableDataCell>
                            </CTableRow>
                        )}
                    </React.Fragment>
                ))}
            </CTableBody>
        </CTable>
    );
};

export default AnalisisTable;
