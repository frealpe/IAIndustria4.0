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

                </CNav>

                <CTabContent className="mt-3">
                    <CTabPane visible={activeTab === 1}>
                        <AgentGuideHelper />
                    </CTabPane>

                </CTabContent>
            </div>
        </div>
    );
};

export default Ajustes;
