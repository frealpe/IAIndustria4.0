import React from 'react';
import { CCard, CCardBody, CCardHeader, CBadge, CSmartTable } from '@coreui/react-pro';

const SensorTable = ({ devices = [], activeDevice = null }) => {
    // Process devices data for the table
    // If we have an active device that is NOT in the list, add it
    let currentDevices = [...devices];
    if (activeDevice && !currentDevices.includes(activeDevice)) {
        currentDevices.push(activeDevice);
    }

    // Transform to object array for CSmartTable
    const tableData = currentDevices.map((dev, index) => ({
        id: index,
        device: dev || 'Unknown Device',
        status: dev === activeDevice ? 'ONLINE' : 'OFFLINE',
        _props: { color: dev === activeDevice ? 'success' : 'light' } // Row styling if needed
    }));

    // Columns configuration
    const columns = [
        { key: 'device', label: 'Dispositivo', _style: { width: '60%' } },
        { key: 'status', label: 'Estado', _style: { width: '40%' } }
    ];

    return (
        <CCard className="h-100 shadow-sm border-0">
            <CCardHeader className="bg-white border-bottom-0 py-3">
                <span className="text-primary fw-bold" style={{ fontSize: '0.9rem' }}>
                    📡 Estado de Sensores
                </span>
            </CCardHeader>
            <CCardBody className="p-0">
                <CSmartTable
                    items={tableData}
                    columns={columns}
                    pagination
                    itemsPerPage={5} // Requested: 5 items per page
                    scopedColumns={{
                        status: (item) => (
                            <td>
                                <CBadge color={item.status === 'ONLINE' ? 'success' : 'secondary'}>
                                    {item.status}
                                </CBadge>
                            </td>
                        )
                    }}
                    tableProps={{
                        hover: true,
                        responsive: true,
                        align: 'middle',
                        className: 'mb-0'
                    }}
                />
            </CCardBody>
        </CCard>
    );
};

export default SensorTable;
