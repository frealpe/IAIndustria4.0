import React from 'react';
import { CDateRangePicker, CButton, CBadge } from '@coreui/react-pro';

/**
 * Component for selecting a date range using CoreUI PRO components.
 */
const DateRangeSelector = ({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    onFilter,
    onReset,
    isFiltered
}) => {
    return (
        <div style={{
            position: 'absolute', top: '20px', left: '10px', zIndex: 20,
            background: 'rgba(255, 255, 255, 0.95)', padding: '5px 10px', borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', gap: '8px', alignItems: 'center',
            border: '1px solid #eee'
        }}>
            <div style={{ width: '220px' }}>
                <CDateRangePicker
                    locale="es-ES"
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={(date) => onStartDateChange(date)}
                    onEndDateChange={(date) => onEndDateChange(date)}
                    timepicker
                    size="sm"
                    placeholder={['Desde', 'Hasta']}
                    cleaner
                />
            </div>

            <div className="d-flex gap-2 align-items-center">
                <CButton
                    color="primary"
                    size="sm"
                    onClick={onFilter}
                    variant="ghost"
                >
                    Filtrar
                </CButton>

                {isFiltered && (
                    <>
                        <CButton
                            color="secondary"
                            size="sm"
                            onClick={onReset}
                            variant="outline"
                        >
                            Reset
                        </CButton>
                        <CBadge color="info" shape="rounded-pill">Histórico</CBadge>
                    </>
                )}
            </div>
        </div>
    );
};

export default DateRangeSelector;
