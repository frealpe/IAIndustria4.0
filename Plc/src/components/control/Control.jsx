import React, { useContext, useEffect, useState, useRef } from "react";
import {
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
} from "@coreui/react-pro";
import { SocketContext } from "../../context/SocketContext";
import { useControl } from "../../hook/control/useControl";
import TableHOC from "../tablas/TableHOC";
import AsistenteBlock from "../asistente/AsistenteBlock";
import SensorTable from "../monitor/SensorTable";
import ControlService from "../../service/control/control.service";
import DeviceCharts from "../graficos/DeviceCharts";

export const Control = () => {
  const { socket } = useContext(SocketContext);
  const [chartData, setChartData] = useState(null);
  const [historialChartData, setHistorialChartData] = useState(null);
  const [agentStats, setAgentStats] = useState(null);
  const [dataSource, setDataSource] = useState('Manual');
  const [selectedRows, setSelectedRows] = useState([]);
  const [highlightedPoint, setHighlightedPoint] = useState(null);

  const [activeDevice, setActiveDevice] = useState(null);

  const controlData = useControl();
  const { anomaliasData, loadInitialData } = controlData || {};

  // INITIAL DATA LOAD
  useEffect(() => {
    if (loadInitialData && typeof loadInitialData === 'function') {
      loadInitialData();
    }
  }, [loadInitialData]);

  // LOAD HISTORICAL DATA FOR CHART ON MOUNT
  useEffect(() => {
    const loadHistoricalData = async () => {
      const result = await ControlService.getRecentLogs(2000); // Load last 2000 logs (optimized for memory)
      if (result.ok && result.data && result.data.length > 0) {
        console.log(`📊 Loaded ${result.data.length} historical logs for chart`);
        // Transform data to match expected format
        const formattedData = result.data.map((log, index) => {
          // Parse resultado if it's a string
          let resultado = log.resultado;
          if (typeof resultado === 'string') {
            try {
              resultado = JSON.parse(resultado);
            } catch (e) {
              console.warn(`Failed to parse resultado for log ${log.id}:`, e);
              resultado = {};
            }
          }

          return {
            id: log.id,
            voltaje: log.mean || 0,
            deviceId: log.device_uid,
            timestamp: log.created_at,
            isAnomaly: resultado?.isAnomaly || false  // Extract anomaly flag from parsed resultado
          };
        });
        console.log(`✅ Formatted ${formattedData.length} data points, Anomalies: ${formattedData.filter(d => d.isAnomaly).length}`);
        setHistorialChartData(formattedData); // Use historical state, not real-time state
        setDataSource('Database');
      } else {
        console.log('No historical data available, waiting for real-time data...');
      }
    };

    loadHistoricalData();
  }, []); // Run once on mount

  // SUSCRIPCIÓN A SOCKET PARA NUEVOS DATOS
  const handleMcpDatosRef = useRef();
  handleMcpDatosRef.current = (incomingData) => {
    if (incomingData && !Array.isArray(incomingData) && incomingData.voltaje !== undefined) {
      if (incomingData.device_uid) setActiveDevice(incomingData.device_uid);

      const newPoint = {
        id: incomingData.id || Date.now(),
        voltaje: incomingData.voltaje,
        voltage: incomingData.voltaje, // Support both names for compatibility
        deviceId: incomingData.device_uid || 'Unknown',
        timestamp: new Date(),
        isAnomaly: incomingData.isAnomaly || false
      };

      setHistorialChartData(prevData => {
        const validPrevData = prevData || [];
        const newData = [...validPrevData, newPoint];
        return newData.length > 3000 ? newData.slice(-3000) : newData;
      });
      setDataSource('Real-time');
    } else {
      let finalData = incomingData;
      let finalStats = null;
      if (!Array.isArray(incomingData) && incomingData.data && Array.isArray(incomingData.data)) {
        finalData = incomingData.data;
        finalStats = incomingData.stats;
      }
      setChartData(finalData);
      setAgentStats(finalStats);
      setDataSource('Agent');

      if (Array.isArray(finalData) && finalData.length > 0) {
        const lastPoint = finalData[finalData.length - 1];
        if (lastPoint && lastPoint.device_uid) {
          setActiveDevice(lastPoint.device_uid);
        }
      }
    }
  };

  useEffect(() => {
    if (!socket) return;

    const onMcpDatos = (data) => handleMcpDatosRef.current(data);
    const handleNewAnomaly = (newRecord) => {
      console.log("🚨 Nueva anomalía recibida:", newRecord);
      if (controlData?.addAnomaly) controlData.addAnomaly(newRecord);
    };

    socket.on('mcpdatos', onMcpDatos);
    socket.on('new_anomaly', handleNewAnomaly);

    return () => {
      socket.off('mcpdatos', onMcpDatos);
      socket.off('new_anomaly', handleNewAnomaly);
    };
  }, [socket, controlData?.addAnomaly]);



  return (
    <div
      className="w-100 p-3"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr', // 2 MAIN COLUMNS (50% / 50%)
        gridTemplateRows: '1fr 1fr', // Flexible equal rows
        gap: '15px',
        overflow: 'hidden',
        height: 'calc(100vh - 140px)'
      }}
    >
      {/* 1. LEFT COLUMN: DEVICE CHARTS (Full Height) */}
      <div style={{ gridColumn: '1 / 2', gridRow: '1 / 3' }}>
        <CCard className="h-100 shadow-lg border-0 d-flex flex-column">
          <CCardBody className="p-1 d-flex flex-column" style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            <DeviceCharts
              data={historialChartData}
              autoLoad={false}
              highlightedTimestamp={highlightedPoint?.timestamp}
              selectedAnomalyIds={selectedRows}
            />
          </CCardBody>
        </CCard>
      </div>

      {/* 2. TOP RIGHT: SENSOR STATUS (Left) + ANOMALIES (Right) */}
      <div style={{ gridColumn: '2 / 3', gridRow: '1 / 2', overflow: 'hidden' }}>
        <div className="h-100" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', height: '100%' }}>
          {/* SENSOR STATUS */}
          <div style={{ overflow: 'hidden', height: '100%' }}>
            <SensorTable devices={controlData?.devices} activeDevice={activeDevice} />
          </div>

          {/* ANOMALY HISTORY TABLE */}
          <div style={{ overflow: 'hidden', height: '100%' }}>
            <CCard className="h-100 shadow-sm border-0">
              <CCardHeader className="bg-white border-bottom-0 py-3">
                <span className="text-danger fw-bold" style={{ fontSize: '0.8rem' }}>
                  ⚠ HISTÓRICO DE ANOMALÍAS
                </span>
              </CCardHeader>
              <CCardBody className="p-0 bg-white d-flex flex-column" style={{ overflow: 'auto', height: '100%' }}>
                {(!anomaliasData || anomaliasData.length === 0) && (
                  <div className="d-flex h-100 align-items-center justify-content-center text-muted fst-italic" style={{ fontSize: '0.9rem', opacity: 0.6 }}>
                    No se han registrado desviaciones en la última sesión.
                  </div>
                )}

                {anomaliasData && anomaliasData.length > 0 && (() => {
                  const groupedAnomalies = anomaliasData.reduce((acc, curr) => {
                    const dev = curr.device_uid || 'Desconocido';
                    if (!acc[dev]) acc[dev] = [];
                    acc[dev].push(curr);
                    return acc;
                  }, {});

                  const tableData = Object.keys(groupedAnomalies).map(dev => ({
                    id: dev,
                    timestamp: groupedAnomalies[dev][0]?.created_at || Date.now(),
                    anomalies: groupedAnomalies[dev],
                    count: groupedAnomalies[dev].length
                  }));

                  return (
                    <TableHOC
                      data={tableData}
                      renderExpandable={(group) => (
                        <div className="w-100">
                          <h6 className="text-secondary mb-2 bg-light p-2 rounded">
                            📋 Anomalías del dispositivo: <strong>{group.id}</strong> ({group.count})
                          </h6>
                          <div style={{ height: '300px' }}>
                            <TableHOC
                              data={group.anomalies}
                              selectedIds={selectedRows}
                              onSelectionChange={setSelectedRows}
                              onRowClick={(row) => {
                                console.log("🔍 Seleccionando punto en gráfica:", row);
                                setHighlightedPoint(row);
                              }}
                              hideActions={true}
                            />
                          </div>
                        </div>
                      )}
                      selectedIds={[]}
                    />
                  );
                })()}
              </CCardBody>
            </CCard>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM RIGHT: ASISTENTE INTEGRADO */}
      <div style={{ gridColumn: '2 / 3', gridRow: '2 / 3', overflow: 'hidden', height: '100%' }}>
        <AsistenteBlock
          onNewData={(d, s) => { setChartData(d); setAgentStats(s); }}
          selectedRows={selectedRows}
          selectedTable="anomalies"
        />
      </div>
    </div >
  );
};
