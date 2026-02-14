import React, { useState, useRef, useEffect } from 'react';
import { CContainer, CCard, CCardBody, CCardHeader, CButton } from '@coreui/react-pro';
import AsistenteBlock from '../../components/asistente/AsistenteBlock';
import ProjectTidyTree from '../../components/analisis/ProjectTidyTree';
import SystemArchitecture from '../../components/analisis/SystemArchitecture';
import DeviceDataForceGraph from '../../components/analisis/DeviceDataForceGraph';

/**
 * View for interactive device data analysis
 */
const Analitica = () => {
    const [chartData, setChartData] = useState(null);
    const [agentStats, setAgentStats] = useState(null);
    const [selectedDevice, setSelectedDevice] = useState(null);

    return (
        <CContainer fluid className="p-4" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            <div className="flex-grow-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', overflow: 'hidden' }}>
                {/* CARD 1: LEFT SIDE (Split into 2 Rows: Architecture & Structure/Data) */}
                <CCard className="h-100 shadow-sm border-0 overflow-hidden">
                    <CCardHeader className="bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                        <strong className="text-primary">🔗 Arquitectura y Estructura del Proyecto</strong>
                        {selectedDevice && (
                            <CButton
                                color="secondary"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedDevice(null)}
                            >
                                Regresar a Estructura
                            </CButton>
                        )}
                    </CCardHeader>
                    <CCardBody className="p-0 h-100 overflow-hidden" style={{ display: 'grid', gridTemplateRows: '0.8fr 1.2fr' }}>
                        {/* ROW 1: System Architecture */}
                        <div className="border-bottom p-1 overflow-hidden" style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 5, left: 10, zIndex: 10, fontSize: '0.8rem', color: '#888' }}>
                                Arquitectura
                            </div>
                            <SystemArchitecture
                                onDeviceSelect={setSelectedDevice}
                                selectedDeviceId={selectedDevice?.id}
                            />
                        </div>

                        {/* ROW 2: Structure (Tree) or Data (Force Graph) */}
                        <div className="p-1 overflow-hidden" style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 5, left: 10, zIndex: 10, fontSize: '0.8rem', color: '#888' }}>
                                {selectedDevice?.type === 'agent'
                                    ? `Grafo de Agentes: ${selectedDevice.name}`
                                    : selectedDevice
                                        ? `Datos: ${selectedDevice.name}`
                                        : 'Estructura del Proyecto'}
                            </div>
                            {selectedDevice?.type === 'agent' ? (
                                <ProjectTidyTree focusAgent={selectedDevice.id} />
                            ) : selectedDevice ? (
                                <DeviceDataForceGraph
                                    device_uid={selectedDevice.id}
                                    device_name={selectedDevice.name}
                                />
                            ) : (
                                <ProjectTidyTree />
                            )}
                        </div>
                    </CCardBody>
                </CCard>

                {/* CARD 2: RIGHT SIDE (Asistente Virtual) */}
                <CCard className="h-100 shadow-sm border-0 overflow-hidden">
                    <CCardHeader className="bg-white border-0 py-3">
                        <strong className="text-primary">🤖 Asistente de Análisis</strong>
                    </CCardHeader>
                    <CCardBody className="p-0 h-100 overflow-hidden d-flex flex-column">
                        {/* Asistente Block - Full height */}
                        <div className="flex-grow-1 overflow-hidden">
                            <AsistenteBlock
                                onNewData={(d, s) => { setChartData(d); setAgentStats(s); }}
                                selectedRows={[]}
                                selectedTable="analitica"
                            />
                        </div>
                    </CCardBody>
                </CCard>
            </div>
        </CContainer>
    );
};

export default Analitica;
