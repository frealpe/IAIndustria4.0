import React from 'react';
import { CCard, CCardBody, CCardHeader } from '@coreui/react-pro';

const SensorStatus = ({ devices = [], activeDevice = null }) => {
    // If we have an active device that is NOT in the list, add it temporarily
    let currentDevices = [...devices];
    if (activeDevice && !currentDevices.includes(activeDevice)) {
        currentDevices.push(activeDevice);
    }

    // If no devices, show placeholders or empty state
    const displaySensors = currentDevices && currentDevices.length > 0
        ? currentDevices.map(dev => ({ name: dev || 'Unknown Device', status: dev === activeDevice ? 'ONLINE' : 'OFFLINE' }))
        : [
            { name: 'Esperando dispositivos...', status: 'OFFLINE' }
        ];

    return (
        <CCard className="h-100 shadow-sm border-0" style={{ backgroundColor: '#F8F9FA' }}>
            <CCardHeader className="bg-transparent border-0 pt-3 pb-0">
                <h6 className="text-uppercase text-muted fw-bold" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>
                    Estado de Sensores
                </h6>
                {/* Temporary DEBUG: Remove later */}
                <small style={{ fontSize: '0.6rem', color: '#ccc' }}>Active: {activeDevice || 'None'}</small>
            </CCardHeader>
            <CCardBody>
                <div className="d-flex flex-column gap-3">
                    {displaySensors.map((sensor, index) => (
                        <div key={index} className="d-flex justify-content-between align-items-center bg-white p-3 rounded shadow-sm">
                            <div className="d-flex align-items-center gap-2">
                                <span className={`status-dot ${sensor.status === 'ONLINE' ? 'bg-success' : 'bg-secondary'}`}
                                    style={{ width: '8px', height: '8px', borderRadius: '50%', opacity: sensor.status === 'ONLINE' ? 1 : 0.5 }}></span>
                                <span className="fw-bold text-dark" style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>
                                    {sensor.name.length > 20 ? `...${sensor.name.slice(-8)}` : sensor.name}
                                </span>
                            </div>
                            <span className={`fw-bold ${sensor.status === 'ONLINE' ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                {sensor.status}
                            </span>
                        </div>
                    ))}
                </div>
            </CCardBody>
        </CCard>
    );
};

export default SensorStatus;
