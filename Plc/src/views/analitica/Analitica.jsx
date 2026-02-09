import React from 'react';
import { CContainer } from '@coreui/react-pro';
import DeviceCharts from '../../components/graficos/DeviceCharts';

/**
 * View for interactive device data analysis using dc.js charts
 */
const Analitica = () => {
    return (
        <CContainer fluid className="p-4">
            <div className="mb-4">
                <h2 className="h4 mb-2">📊 Análisis Interactivo de Datos</h2>
                <p className="text-muted mb-0">
                    Explora los datos históricos de tus dispositivos con gráficas interactivas.
                    Haz clic en cualquier elemento para filtrar los datos en todas las visualizaciones.
                </p>
            </div>

            <DeviceCharts autoLoad={true} />
        </CContainer>
    );
};

export default Analitica;
