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
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState(null);

    // DRAG & DROP LOGIC
    const [assistPosition, setAssistPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    const handleDragStart = (e) => {
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX - assistPosition.x,
            y: e.clientY - assistPosition.y
        };
        e.stopPropagation();
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            setAssistPosition({
                x: e.clientX - dragStartRef.current.x,
                y: e.clientY - dragStartRef.current.y
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

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
                                {selectedDevice ? `Datos: ${selectedDevice.name}` : 'Estructura del Proyecto'}
                            </div>
                            {selectedDevice ? (
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

                {/* CARD 2: RIGHT SIDE (Empty) */}
                <CCard className="h-100 shadow-sm border-0 overflow-hidden">
                    <CCardBody className="p-1 h-100 overflow-hidden d-flex justify-content-center align-items-center text-muted">
                        <div className="text-center">
                            <h5>Espacio Disponible</h5>
                            <p>Seleccione una opción para visualizar aquí.</p>
                        </div>
                    </CCardBody>
                </CCard>
            </div>

            {/* FLOATING ASSISTANT */}
            <div
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '25px',
                    zIndex: 1050,
                    width: isAssistantOpen ? '400px' : '60px',
                    height: isAssistantOpen ? '600px' : '60px',
                    transition: isDragging ? 'none' : 'all 0.3s ease-in-out',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    borderRadius: isAssistantOpen ? '10px' : '50%',
                    overflow: 'hidden',
                    backgroundColor: isAssistantOpen ? 'white' : '#0d6efd',
                    transform: `translate(${assistPosition.x}px, ${assistPosition.y}px)`
                }}
            >
                {!isAssistantOpen ? (
                    <div
                        className="w-100 h-100 d-flex justify-content-center align-items-center text-white"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setIsAssistantOpen(true)}
                        title="Abrir Asistente"
                    >
                        <span style={{ fontSize: '24px' }}>💬</span>
                    </div>
                ) : (
                    <div className="d-flex flex-column h-100 relative">
                        <div
                            className="d-flex justify-content-between align-items-center bg-light px-3 py-2 border-bottom"
                            style={{ cursor: 'move', userSelect: 'none' }}
                            onMouseDown={handleDragStart}
                        >
                            <strong className="text-primary pointer-events-none">🤖 Asistente Virtual</strong>
                            <CButton
                                color="secondary"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsAssistantOpen(false)}
                            >
                                ✕
                            </CButton>
                        </div>
                        <div className="flex-grow-1 overflow-hidden bg-white">
                            <AsistenteBlock
                                onNewData={(d, s) => { setChartData(d); setAgentStats(s); }}
                                selectedRows={[]}
                                selectedTable="analitica"
                            />
                        </div>
                    </div>
                )}
            </div>
        </CContainer>
    );
};

export default Analitica;
