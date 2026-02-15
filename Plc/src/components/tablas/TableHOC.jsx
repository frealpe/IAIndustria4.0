import React, { useState } from 'react';
import {
    CTable,
    CTableHead,
    CTableBody,
    CTableRow,
    CTableHeaderCell,
    CTableDataCell,
    CPagination,
    CPaginationItem,
    CButton,
    CFormCheck
} from "@coreui/react-pro";
import CIcon from '@coreui/icons-react';
import { cilChartLine, cilChevronRight, cilChevronBottom } from '@coreui/icons';

const TableHOC = ({ data, onRowClick, selectedIds = [], onSelectionChange, renderExpandable, hideActions = false, hiddenColumns = [] }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedRows, setExpandedRows] = useState([]); // Estado para filas expandidas
    const itemsPerPage = 5;

    if (!data || data.length === 0) return <div className="text-muted p-2">Sin datos disponibles</div>;

    // Filter logic: Only show pages for current page
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(data.length / itemsPerPage);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const toggleRow = (id) => {
        const currentIndex = expandedRows.indexOf(id);
        const newExpandedRows = [...expandedRows];

        if (currentIndex === -1) {
            newExpandedRows.push(id);
        } else {
            newExpandedRows.splice(currentIndex, 1);
        }
        setExpandedRows(newExpandedRows);
    };

    const isExpanded = (item) => {
        const identifier = item.id || item.prueba || JSON.stringify(item);
        return expandedRows.includes(identifier);
    };

    // ... (Mismo código de handleInternalRowClick, handleSelect, isSelected, getDate) ...
    const handleInternalRowClick = (item) => {
        console.log("Fila clickeada:", item);
        // Pass the complete item, not just resultado
        // The receiving component can extract resultado if needed
        if (onRowClick) {
            onRowClick(item); // Pass complete record
        }
    };

    const handleSelect = (item) => {
        const identifier = item.id || item.prueba; // Identificador único
        if (!onSelectionChange) return;
        if (selectedIds.includes(identifier)) {
            onSelectionChange(selectedIds.filter(id => id !== identifier));
        } else {
            onSelectionChange([...selectedIds, identifier]);
        }
    };

    const isSelected = (item) => {
        const identifier = item.id || item.prueba;
        return selectedIds.includes(identifier);
    };

    const getDate = (item) => {
        const val = item.timestamp || item.prueba || item.fecha || item.date || item.createdAt || item.created_at || item.time;
        if (!val) return "N/A";
        try {
            const dateObj = new Date(val);
            if (!isNaN(dateObj.getTime())) {
                return dateObj.toLocaleString('es-ES', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                });
            }
        } catch (e) { }
        return val;
    };


    return (
        <div className="d-flex flex-column h-100">
            <div className="flex-grow-1 overflow-auto">
                <CTable hover responsive>
                    <CTableHead>
                        <CTableRow>
                            <CTableHeaderCell scope="col" style={{ width: '40px' }}></CTableHeaderCell>
                            <CTableHeaderCell scope="col" style={{ width: '40px' }}>Sel</CTableHeaderCell>
                            <CTableHeaderCell scope="col">Dispositivo</CTableHeaderCell> {/* Nueva Columna */}
                            {!hiddenColumns.includes('id') && <CTableHeaderCell scope="col">ID</CTableHeaderCell>}
                            <CTableHeaderCell scope="col">Fecha</CTableHeaderCell>
                            {!hideActions && <CTableHeaderCell scope="col" className="text-end">Acciones</CTableHeaderCell>}
                        </CTableRow>
                    </CTableHead>
                    <CTableBody>
                        {currentItems.map((item, index) => {
                            const identifier = item.id || item.prueba || JSON.stringify(item);
                            const expanded = isExpanded(item);

                            return (
                                <React.Fragment key={identifier}>
                                    <CTableRow active={isSelected(item)}>
                                        <CTableDataCell>
                                            <CButton
                                                color="transparent"
                                                size="sm"
                                                className="p-0 border-0 text-secondary"
                                                onClick={() => toggleRow(identifier)}
                                            >
                                                <CIcon icon={expanded ? cilChevronBottom : cilChevronRight} />
                                            </CButton>
                                        </CTableDataCell>
                                        <CTableDataCell>
                                            <CFormCheck
                                                checked={isSelected(item)}
                                                onChange={() => handleSelect(item)}
                                            />
                                        </CTableDataCell>
                                        <CTableDataCell>
                                            <small className="text-primary fw-bold">
                                                {item.device_uid ? item.device_uid.slice(-4) : (item.id && typeof item.id === 'string' && item.id.length > 5 ? item.id.slice(-4) : 'N/A')}
                                            </small>
                                        </CTableDataCell>
                                        {!hiddenColumns.includes('id') && (
                                            <CTableDataCell style={{ wordBreak: 'break-all', maxWidth: '120px', fontSize: '0.75rem', lineHeight: '1.2' }}>
                                                {item.id}
                                            </CTableDataCell>
                                        )}
                                        <CTableDataCell onClick={() => handleInternalRowClick(item)} style={{ cursor: 'pointer' }}>
                                            {getDate(item)}
                                        </CTableDataCell>
                                        {!hideActions && (
                                            <CTableDataCell className="text-end">
                                                <CButton
                                                    color="info"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleInternalRowClick(item)}
                                                    title="Ver Gráfica"
                                                >
                                                    <CIcon icon={cilChartLine} />
                                                </CButton>
                                            </CTableDataCell>
                                        )}
                                    </CTableRow>
                                    {expanded && (
                                        <CTableRow>
                                            <CTableDataCell colSpan="6" className="bg-light p-3">
                                                <div className="small border rounded bg-white p-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                                    {renderExpandable ? renderExpandable(item) : (
                                                        <>
                                                            <strong>Detalles del Registro:</strong>
                                                            <pre className="mt-2 text-muted" style={{ fontSize: '0.85em' }}>
                                                                {JSON.stringify(item, null, 2)}
                                                            </pre>
                                                        </>
                                                    )}
                                                </div>
                                            </CTableDataCell>
                                        </CTableRow>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </CTableBody>
                </CTable>
            </div>

            {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-2">
                    <CPagination aria-label="Page navigation">
                        <CPaginationItem
                            disabled={currentPage === 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                            style={{ cursor: currentPage === 1 ? 'default' : 'pointer' }}
                        >
                            &laquo;
                        </CPaginationItem>
                        {[...Array(totalPages)].map((_, i) => (
                            <CPaginationItem
                                key={i + 1}
                                active={i + 1 === currentPage}
                                onClick={() => handlePageChange(i + 1)}
                                style={{ cursor: 'pointer' }}
                            >
                                {i + 1}
                            </CPaginationItem>
                        ))}
                        <CPaginationItem
                            disabled={currentPage === totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
                            style={{ cursor: currentPage === totalPages ? 'default' : 'pointer' }}
                        >
                            &raquo;
                        </CPaginationItem>
                    </CPagination>
                </div>
            )}
        </div>
    );
};

export default TableHOC;
