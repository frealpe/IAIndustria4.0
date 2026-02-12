import React, { useState, useEffect } from 'react';
import {
    CCard,
    CCardBody,
    CButton,
    CRow,
    CCol,
    CFormRange,
    CSpinner,
    CTooltip,
    CBadge
} from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import {
    cilPowerStandby,
    cilReload,
    cilTrash,
    cilBolt,
    cilLan,
    cilSettings
} from '@coreui/icons';

const DeviceControlMap = ({ device, socket }) => {
    const [sending, setSending] = useState({
        relay1: false,
        relay2: false,
        dimmer: false,
        restart: false,
        restore: false,
        gpio: false
    });

    const [dimmerValue, setDimmerValue] = useState(0);
    const [gpioPin, setGpioPin] = useState(2);
    const [gpioState, setGpioState] = useState(false);

    // Topic global definido en el firmware
    const topic = "Plc/Esp32";

    const sendCommand = (type, data) => {
        if (!socket || !device) return;

        const typeKey = type.toLowerCase();
        setSending(prev => ({ ...prev, [typeKey]: true }));

        const payload = {
            method: "POST",
            type: type,
            deviceMqttId: "frontend-client", // Identificador para evitar bucles si fuera necesario
            data: data
        };

        console.log(`📤 [ControlMap] Sending ${type}:`, payload);
        socket.emit('mqtt:command', {
            topic: topic,
            payload: payload
        });

        // Feedback visual temporal
        setTimeout(() => {
            setSending(prev => ({ ...prev, [typeKey]: false }));
        }, 800);
    };

    const handleRelay = (relay, state) => {
        sendCommand("RELAYS", {
            protocol: "MQTT",
            output: relay,
            value: state
        });
    };

    const handleDimmer = () => {
        sendCommand("DIMMER", {
            protocol: "MQTT",
            output: "Dimmer",
            value: parseInt(dimmerValue)
        });
    };

    const handleSystem = (type) => {
        if (!window.confirm(`¿Estás seguro de ejecutar ${type === 'RESTART' ? 'REINICIO' : 'RESTAURACIÓN'} en el dispositivo ${device.device_uid}?`)) return;

        sendCommand(type, {
            origin: "MQTT"
        });
    };

    const handleAdvancedGpio = (state) => {
        sendCommand("GPIO", {
            pin: parseInt(gpioPin),
            state: state
        });
    };

    return (
        <div className="device-control-map p-3 bg-light rounded border shadow-sm">
            <h6 className="mb-3 border-bottom pb-2 d-flex align-items-center gap-2">
                <CIcon icon={cilSettings} /> Control Interactivo: <code className="text-primary">{device.device_uid}</code>
            </h6>

            <CRow className="g-3">
                {/* RELAYS */}
                <CCol md={4}>
                    <CCard className="h-100 border-top-3 border-top-primary shadow-sm">
                        <CCardBody className="p-3 text-center">
                            <div className="fw-bold mb-3 text-uppercase small text-muted">Relés de Potencia</div>
                            <div className="d-flex flex-column gap-2">
                                <div className="d-flex justify-content-between align-items-center p-2 border rounded bg-white">
                                    <span className="small fw-semibold">RELAY 1</span>
                                    <div className="d-flex gap-1">
                                        <CButton color="success" size="sm" variant="ghost" onClick={() => handleRelay("RELAY1", true)} disabled={sending.relays}>ON</CButton>
                                        <CButton color="danger" size="sm" variant="ghost" onClick={() => handleRelay("RELAY1", false)} disabled={sending.relays}>OFF</CButton>
                                    </div>
                                </div>
                                <div className="d-flex justify-content-between align-items-center p-2 border rounded bg-white">
                                    <span className="small fw-semibold">RELAY 2</span>
                                    <div className="d-flex gap-1">
                                        <CButton color="success" size="sm" variant="ghost" onClick={() => handleRelay("RELAY2", true)} disabled={sending.relays}>ON</CButton>
                                        <CButton color="danger" size="sm" variant="ghost" onClick={() => handleRelay("RELAY2", false)} disabled={sending.relays}>OFF</CButton>
                                    </div>
                                </div>
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>

                {/* DIMMER */}
                <CCol md={4}>
                    <CCard className="h-100 border-top-3 border-top-warning shadow-sm">
                        <CCardBody className="p-3 text-center">
                            <div className="fw-bold mb-3 text-uppercase small text-muted">Control Dimmer (PWM)</div>
                            <div className="p-2 border rounded bg-white mb-2">
                                <div className="d-flex justify-content-between mb-1">
                                    <CIcon icon={cilBolt} className="text-warning" />
                                    <span className="fw-bold text-primary">{dimmerValue}%</span>
                                </div>
                                <CFormRange
                                    min="0" max="100"
                                    value={dimmerValue}
                                    onChange={(e) => setDimmerValue(e.target.value)}
                                />
                            </div>
                            <CButton color="warning" size="sm" className="w-100 text-white" onClick={handleDimmer} disabled={sending.dimmer}>
                                {sending.dimmer ? <CSpinner size="sm" /> : 'APLICAR INTENSIDAD'}
                            </CButton>
                        </CCardBody>
                    </CCard>
                </CCol>

                {/* SISTEMA */}
                <CCol md={4}>
                    <CCard className="h-100 border-top-3 border-top-danger shadow-sm">
                        <CCardBody className="p-3 text-center">
                            <div className="fw-bold mb-3 text-uppercase small text-muted">Acciones de Sistema</div>
                            <div className="d-grid gap-2">
                                <CButton color="info" variant="outline" size="sm" className="d-flex align-items-center justify-content-center gap-2" onClick={() => handleSystem('RESTART')} disabled={sending.restart}>
                                    <CIcon icon={cilReload} /> REINICIAR ESP32
                                </CButton>
                                <CButton color="danger" variant="outline" size="sm" className="d-flex align-items-center justify-content-center gap-2" onClick={() => handleSystem('RESTORE')} disabled={sending.restore}>
                                    <CIcon icon={cilTrash} /> FACTORY RESET
                                </CButton>
                                <div className="mt-1">
                                    <CBadge color="light" shape="rounded-pill" className="text-dark border small w-100">
                                        IP: {device.mac_address}
                                    </CBadge>
                                </div>
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>

                {/* ADVANCED GPIO */}
                <CCol xs={12}>
                    <div className="mt-2 p-2 border-top">
                        <small className="text-muted fw-bold d-flex align-items-center gap-1 mb-2">
                            <CIcon icon={cilLan} size="sm" /> CONTROL AVANZADO GPIO
                        </small>
                        <div className="d-flex align-items-center gap-3">
                            <div className="d-flex align-items-center gap-2 bg-white px-2 py-1 border rounded">
                                <label className="small mb-0">PIN:</label>
                                <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    style={{ width: '60px' }}
                                    value={gpioPin}
                                    onChange={(e) => setGpioPin(e.target.value)}
                                />
                            </div>
                            <div className="d-flex gap-1">
                                <CButton color="success" size="sm" onClick={() => handleAdvancedGpio(true)} disabled={sending.gpio}>SET HIGH</CButton>
                                <CButton color="secondary" size="sm" onClick={() => handleAdvancedGpio(false)} disabled={sending.gpio}>SET LOW</CButton>
                            </div>
                            {sending.gpio && <CSpinner size="sm" color="primary" />}
                        </div>
                    </div>
                </CCol>
            </CRow>
        </div>
    );
};

export default DeviceControlMap;
