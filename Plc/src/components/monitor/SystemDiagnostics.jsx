import React from 'react';
import { CCard, CCardBody, CCardHeader } from '@coreui/react-pro';

const SystemDiagnostics = () => {
    return (
        <CCard className="h-100 shadow-sm border-0 text-white" style={{ backgroundColor: '#1E293B' }}>
            <CCardHeader className="bg-transparent border-0 pt-3 pb-0">
                <h6 className="text-uppercase text-secondary fw-bold" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>
                    Diagnóstico de Sistema
                </h6>
            </CCardHeader>
            <CCardBody className="d-flex flex-column justify-content-center">
                <p className="mb-0" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                    Iniciando protocolos de comunicación industrial.
                    <br />
                    <span style={{ opacity: 0.7 }}>Por favor, verifique la conexión física del Gateway.</span>
                </p>
            </CCardBody>
        </CCard>
    );
};

export default SystemDiagnostics;
