import React from 'react';
import { VegaLite } from 'react-vega';
import { CCard, CCardBody, CCardHeader } from '@coreui/react-pro';

/**
 * Component to render Vega-Lite chart specifications dynamically
 * @param {string} title - Chart title (optional)
 * @param {object} spec - Vega-Lite specification object
 * @param {number} height - Chart height in pixels (default: 400)
 */
const VegaChartRenderer = ({ title, spec, height = 400 }) => {
    // Actions to show in the Vega embed menu
    const actions = {
        export: true,    // Allow downloading chart as PNG/SVG
        source: false,   // Don't show spec JSON
        compiled: false, // Don't show compiled Vega spec
        editor: false    // Don't show editor link
    };

    // Ensure spec has responsive width
    const responsiveSpec = {
        ...spec,
        width: 'container',
        height: height,
        autosize: {
            type: 'fit',
            contains: 'padding'
        }
    };

    return (
        <CCard className="shadow-sm border-0 mb-3">
            {title && (
                <CCardHeader className="bg-white border-bottom py-2">
                    <strong className="text-primary">📊 {title}</strong>
                </CCardHeader>
            )}
            <CCardBody className="p-3">
                <VegaLite
                    spec={responsiveSpec}
                    actions={actions}
                />
            </CCardBody>
        </CCard>
    );
};

export default VegaChartRenderer;
