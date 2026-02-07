import React, { useContext, useEffect, useState, useRef } from "react";
import {
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CButton,
} from "@coreui/react-pro";
import { SocketContext } from "../../context/SocketContext";
// import { useInteligenciaStore } from "../../hook/inteligencia/useInteligencia"; // Removed as requested refactor moves logic to component
import { useControl } from "../../hook/control/useControl";
import TarjetaTransparente from "../tarjeta/TarjetaTransparente";
// import AiChartComponent from "../graficos/AiChartComponent";
import AdcRealtimeChart from "../graficos/AdcRealtimeChart";
import TableHOC from "../tablas/TableHOC";
// import GptMessage from "../tarjeta/GptMessage";
// import MyMessage from "../tarjeta/MyMessage";
// import TypingLoader from "../loaders/TypingLoader";
// import TextMessageBox from "../tarjeta/TextMessageBox";

// New Components
import AnalisisBlock from "../analisis/AnalisisBlock";
import AsistenteBlock from "../asistente/AsistenteBlock";

export const Control = () => {
  // const { envioMensajeIA } = useInteligenciaStore(); // Removed as requested refactor moves logic to component
  const { socket } = useContext(SocketContext);

  // const [messages, setMessages] = useState([]); // Removed as requested refactor moves logic to component
  // const [isLoading, setIsLoading] = useState(false); // Removed as requested refactor moves logic to component
  const [chartData, setChartData] = useState(null);
  const [historialChartData, setHistorialChartData] = useState(null); // Separate state for historical data
  const [agentStats, setAgentStats] = useState(null);
  const [dataSource, setDataSource] = useState('Manual');
  const [activeTab, setActiveTab] = useState('realtime'); // 'realtime' | 'historical'
  const [selectedRows, setSelectedRows] = useState([]); // Estado para selección múltiple de filas
  const [isAssistantOpen, setIsAssistantOpen] = useState(false); // Estado para asistente flotante


  const controlData = useControl();
  const { caracterizacionData, comparacionData, dataloggerData, anomaliasData, loadInitialData } = controlData || {};

  // const messagesEndRef = useRef(null); // Removed as requested refactor moves logic to component

  // =======================
  // INITIAL DATA LOAD
  // =======================
  useEffect(() => {
    console.log("useControl content:", controlData);
    if (loadInitialData && typeof loadInitialData === 'function') {
      loadInitialData();
    } else {
      console.warn("loadInitialData is missing or not a function:", loadInitialData);
    }
  }, [loadInitialData]);


  // =======================
  // SOCKET LISTENER
  // =======================
  useEffect(() => {
    if (!socket) return;

    const handleMcpDatos = (incomingData) => {
      // LOGIC FOR SINGLE DATA POINT (Streaming)
      if (incomingData && !Array.isArray(incomingData) && incomingData.voltaje !== undefined) {
        // ... (código existente)
        console.log("⚡ Stream dato recibido:", incomingData.voltaje);
        setChartData((prevData) => {
          const current = Array.isArray(prevData) ? prevData : [];
          const updated = [...current, incomingData];
          return updated.length > 100 ? updated.slice(-100) : updated;
        });
        setDataSource('Agent');
      }
      // LOGIC FOR FULL ARRAY (Legacy/Snapshot)
      else {
        // ... (código existente)
        let finalData = incomingData;
        let finalStats = null;
        if (!Array.isArray(incomingData) && incomingData.data && Array.isArray(incomingData.data)) {
          finalData = incomingData.data;
          finalStats = incomingData.stats;
        }
        setChartData(finalData);
        setAgentStats(finalStats);
        setDataSource('Agent');
      }
    };

    const handleNewAnomaly = (newRecord) => {
      console.log("🚨 Nueva anomalía recibida por Socket:", newRecord);
      if (controlData && controlData.addAnomaly) {
        controlData.addAnomaly(newRecord); // Actualizar store y tabla en tiempo real
      }
    };

    socket.on('mcpdatos', handleMcpDatos);
    socket.on('new_anomaly', handleNewAnomaly); // Escuchar evento de anomalía

    return () => {
      socket.off('mcpdatos', handleMcpDatos);
      socket.off('new_anomaly', handleNewAnomaly);
    };
  }, [socket, controlData]); // Agregar controlData a dependencias


  // =======================
  // DRAG & DROP LOGIC
  // =======================
  const [assistPosition, setAssistPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleDragStart = (e) => {
    setIsDragging(true);
    // Calcular offset relativo a la posición actual
    dragStartRef.current = {
      x: e.clientX - assistPosition.x,
      y: e.clientY - assistPosition.y
    };
    e.stopPropagation(); // Evitar otros eventos
    e.preventDefault(); // Evitar selección de texto
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
    <div
      className="w-100 p-1"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr', // 50% - 50%
        gridTemplateRows: '1fr 1fr', // Filas iguales
        gap: '10px',
        height: '88vh', // Altura casi total
        boxSizing: 'border-box'
      }}
    >
      {/* ============================== */}
      {/* 1. LEFT TOP: GRÁFICA           */}
      {/* ============================== */}
      <div style={{ gridColumn: '1 / 2', gridRow: '1 / 2', overflow: 'hidden' }}>
        <CCard className="h-100 shadow-sm">
          <CCardHeader className="bg-light p-0">
            <CNav variant="tabs" className="justify-content-start border-bottom-0">
              <CNavItem>
                <CNavLink
                  active={activeTab === 'realtime'}
                  onClick={() => setActiveTab('realtime')}
                  style={{ cursor: 'pointer', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
                  className={activeTab === 'realtime' ? 'fw-bold text-danger border-bottom border-danger border-3' : 'text-muted'}
                >
                  📊 Tiempo Real
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={activeTab === 'historical'}
                  onClick={() => setActiveTab('historical')}
                  style={{ cursor: 'pointer', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
                  className={activeTab === 'historical' ? 'fw-bold text-info border-bottom border-info border-3' : 'text-muted'}
                >
                  🗄️ Análisis Histórico
                </CNavLink>
              </CNavItem>
            </CNav>
          </CCardHeader>
          <CCardBody className="p-1 d-flex flex-column justify-content-center align-items-center bg-white overflow-hidden">
            <CTabContent className="w-100 h-100">

              {/* TAB 1: TIEMPO REAL */}
              <CTabPane visible={activeTab === 'realtime'} className="h-100 w-100 fade show">
                {chartData ? (
                  <div className="w-100 h-100 relative">
                    <div className="position-absolute top-0 end-0 p-2 z-10">
                      <CBadge color={dataSource === 'Agent' ? 'danger' : 'success'}>
                        {dataSource === 'Agent' ? 'LIVE' : 'BUFFER'}
                      </CBadge>
                      <span className="ms-2 small text-muted">{chartData.length} pts</span>
                    </div>
                    <AdcRealtimeChart data={chartData} width="container" height={320} />
                  </div>
                ) : (
                  <div className="text-center text-muted p-5">Esperando datos...</div>
                )}
              </CTabPane>

              {/* TAB 2: HISTÓRICO */}
              <CTabPane visible={activeTab === 'historical'} className="h-100 w-100 fade show">
                {historialChartData ? (
                  <div className="w-100 h-100">
                    <div className="text-end p-1">
                      <small className="text-info fw-bold">Registro Seleccionado</small>
                    </div>
                    <AdcRealtimeChart data={historialChartData} width="container" height={320} />
                  </div>
                ) : (
                  <div className="d-flex h-100 align-items-center justify-content-center text-muted flex-column">
                    <h6 className="mb-0">Selecciona una anomalía</h6>
                    <small>Haz click en el botón de gráfica de la tabla inferior</small>
                  </div>
                )}
              </CTabPane>

            </CTabContent>
          </CCardBody>
        </CCard>
      </div>

      {/* ============================== */}
      {/* 2. LEFT BOTTOM: TABLAS BD      */}
      {/* ============================== */}
      {/* ============================== */}
      {/* 2. LEFT BOTTOM: TABLA ANOMALÍAS */}
      {/* ============================== */}
      <div style={{ gridColumn: '1 / 2', gridRow: '2 / 3', overflow: 'hidden' }}>
        <CCard className="h-100 shadow-sm">
          <CCardHeader className="bg-light d-flex justify-content-between align-items-center py-2">
            <small className="fw-bold text-danger">🚨 Histórico de Anomalías</small>
            <CBadge color="danger" shape="rounded-pill">{anomaliasData?.length || 0}</CBadge>
          </CCardHeader>
          <CCardBody className="p-2 bg-white d-flex flex-column" style={{ overflow: 'hidden' }}>
            {/* Logic for Grouping */}
            {(() => {
              const groupedAnomalies = React.useMemo(() => {
                if (!anomaliasData) return [];
                const groups = {};
                anomaliasData.forEach(a => {
                  const dev = a.device_uid || 'Desconocido';
                  if (!groups[dev]) groups[dev] = [];
                  groups[dev].push(a);
                });
                return Object.keys(groups).map(dev => ({
                  id: dev, // Shows as Device UID in outer table
                  timestamp: groups[dev][0]?.created_at || Date.now(),
                  anomalies: groups[dev],
                  count: groups[dev].length
                }));
              }, [anomaliasData]);

              return (
                <TableHOC
                  data={groupedAnomalies}
                  renderExpandable={(group) => (
                    <div className="w-100">
                      <h6 className="text-secondary mb-2 bg-light p-2 rounded">
                        📋 Anomalías del dispositivo: <strong>{group.id}</strong> ({group.count})
                      </h6>
                      <div style={{ height: '300px' }}>
                        <TableHOC
                          data={group.anomalies}
                          onRowClick={(d) => {
                            const rawData = d.rawValues || d.dataSnapshot || d.resultado || d;
                            let formattedData = [];
                            if (Array.isArray(rawData)) {
                              formattedData = rawData.map((val, idx) => ({
                                id: idx,
                                voltaje: val,
                                timestamp: d.timestamp || Date.now(),
                                deviceId: 'Histórico'
                              }));
                            }
                            setHistorialChartData(formattedData);
                            setActiveTab('historical');
                            setAgentStats(null);
                          }}
                          selectedIds={selectedRows}
                          onSelectionChange={setSelectedRows}
                        />
                      </div>
                    </div>
                  )}
                  onRowClick={() => { }} // Outer click does nothing specific yet
                  selectedIds={[]} // Outer selection not implemented/requested
                />
              );
            })()}
          </CCardBody>
        </CCard>
      </div>

      {/* ============================== */}
      {/* 3. RIGHT: CHAT / ASISTENTE     */}
      {/* ============================== */}
      {/* ============================== */}
      {/* 3. RIGHT COLUMN                */}
      {/* ============================== */}
      <div style={{ gridColumn: '2 / 3', gridRow: '1 / 3', overflow: 'hidden' }}>
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <AnalisisBlock data={chartData} agentStats={agentStats} />
        </div>
      </div>

      {/* ============================== */}
      {/* FLOATING ASSISTANT             */}
      {/* ============================== */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1050,
          width: isAssistantOpen ? '400px' : '60px',
          height: isAssistantOpen ? '600px' : '60px',
          transition: isDragging ? 'none' : 'all 0.3s ease-in-out', // Quitar transición al arrastrar para suavidad
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          borderRadius: isAssistantOpen ? '10px' : '50%',
          overflow: 'hidden',
          backgroundColor: isAssistantOpen ? 'white' : '#0d6efd',
          transform: `translate(${assistPosition.x}px, ${assistPosition.y}px)` // Aplicar posición
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
              style={{ cursor: 'move', userSelect: 'none' }} // Cursor de movimiento
              onMouseDown={handleDragStart} // Iniciar arrastre
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
                selectedRows={selectedRows}
                selectedTable={activeTab === 'realtime' ? 'realtime' : activeTab === 'historical' ? 'historical' : 'anomalies'}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
