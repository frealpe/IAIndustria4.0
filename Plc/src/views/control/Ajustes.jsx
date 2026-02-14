import React, { useState } from 'react';
import { CNav, CNavItem, CNavLink, CTabContent, CTabPane } from '@coreui/react-pro';
import AgentGuideHelper from '../../components/help/AgentGuideHelper';

const Ajustes = () => {
    const [activeTab, setActiveTab] = useState(1);

    return (
        <div className="card">
            <div className="card-header">
                <h4>Ajustes del Sistema</h4>
            </div>
            <div className="card-body">
                <CNav variant="tabs" role="tablist">
                    <CNavItem>
                        <CNavLink
                            active={activeTab === 1}
                            onClick={() => setActiveTab(1)}
                            style={{ cursor: 'pointer' }}
                        >
                            💡 Guía de Uso del Asistente
                        </CNavLink>
                    </CNavItem>
                    <CNavItem>
                        <CNavLink
                            active={activeTab === 2}
                            onClick={() => setActiveTab(2)}
                            style={{ cursor: 'pointer' }}
                        >
                            ⚙️ Configuración
                        </CNavLink>
                    </CNavItem>
                </CNav>

                <CTabContent className="mt-3">
                    <CTabPane visible={activeTab === 1}>
                        <AgentGuideHelper />
                    </CTabPane>
                    <CTabPane visible={activeTab === 2}>
                        <div className="alert alert-info">
                            <h5>Configuración General</h5>
                            <p>Esta sección estará disponible próximamente para configurar preferencias de la aplicación.</p>
                        </div>
                    </CTabPane>
                </CTabContent>
            </div>
        </div>
    );
};

export default Ajustes;
