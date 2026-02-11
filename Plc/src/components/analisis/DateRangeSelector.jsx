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
    isFiltered,
    style = {},
    embedded = false
}) => {
    return (
        <div style={{
            ...(!embedded && {
                position: 'absolute', top: '20px', left: '10px', zIndex: 20,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: '1px solid #eee',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
            }),
            display: 'flex',
            flexDirection: embedded ? 'column' : 'row',
            gap: '8px',
            alignItems: embedded ? 'stretch' : 'center', // Stretch for full width
            padding: '5px 10px',
            ...style
        }}>

            {/* Buttons Row (Top if embedded) */}
            <div className="d-flex gap-2 align-items-center" style={{ justifyContent: embedded ? 'flex-end' : 'flex-start' }}>
                <CButton
                    color="primary"
                    size="sm"
                    onClick={onFilter}
                    variant="ghost"
                >
                    Filtrar
                </CButton>

                {isFiltered && (
                    <CButton
                        color="secondary"
                        size="sm"
                        onClick={onReset}
                        variant="outline"
                    >
                        Reset
                    </CButton>
                )}
            </div>

            {/* Date Picker (Bottom if embedded, Left if not) */}
            <div style={{ width: embedded ? '100%' : '220px' }}>
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
        </div>
    );
};

export default DateRangeSelector;
