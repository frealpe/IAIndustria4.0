
import React from 'react';
import { CButton, CCard, CCardBody, CCardHeader } from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import { cilCloudDownload } from '@coreui/icons';
import ProjectCommunicationSankey from './ProjectCommunicationSankey';

const Historial = () => {

    const handleDownloadStructure = () => {
        // Usar variable de entorno para la URL base (maneja HTTPS/HTTP según config)
        const baseUrl = import.meta.env.VITE_API_URL || 'https://localhost:8080/api/';
        // Eliminar slash final si existe para evitar doble barra
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

        const apiUrl = `${cleanBaseUrl}/data/project-structure`;

        // Crear un elemento <a> temporal para forzar la descarga
        const link = document.createElement('a');
        link.href = apiUrl;
        link.setAttribute('download', 'projectStructure.json'); // Nombre sugerido
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <CCard className="mb-4">
                <CCardHeader>
                    Reporte y Estructura del Proyecto
                </CCardHeader>
                <CCardBody>
                    <p>Aquí puedes descargar la estructura actual del proyecto en formato JSON.</p>
                    <CButton color="primary" onClick={handleDownloadStructure}>
                        <CIcon icon={cilCloudDownload} className="me-2" />
                        Descargar Estructura (JSON)
                    </CButton>
                </CCardBody>
            </CCard>

            <ProjectCommunicationSankey />
        </>
    )
}

export default Historial
