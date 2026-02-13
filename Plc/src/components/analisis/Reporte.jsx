import React, { useEffect, useState } from 'react';
import { CCard, CCardBody, CCardHeader, CButton, CAlert } from '@coreui/react-pro';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import VegaChartRenderer from './VegaChartRenderer';

// Initialize pdfMake fonts with robust fallback
try {
    if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
        pdfMake.vfs = pdfFonts.pdfMake.vfs;
    } else if (pdfFonts && pdfFonts.vfs) {
        pdfMake.vfs = pdfFonts.vfs;
    } else {
        console.warn("⚠️ pdfMake: Could not find vfs in pdfFonts. Fonts might not load.");
    }
} catch (e) {
    console.error("❌ pdfMake: Error assigning vfs.", e);
}

const Reporte = ({ data }) => {
    // Render native HTML if data exists
    if (!data) return (
        <CCard className="h-100 shadow-sm border-0">
            <CCardBody className="d-flex justify-content-center align-items-center text-muted">
                <div className="text-center">
                    <h5>Generador de Reportes</h5>
                    <p>Realice un análisis con el Asistente para generar un reporte.</p>
                </div>
            </CCardBody>
        </CCard>
    );

    const { resumen, metrias, conclusion } = data;

    const handleDownloadPdf = () => {
        const date = new Date().toLocaleString();
        const docDefinition = {
            content: [
                { text: 'Reporte de Análisis IA - Industria 4.0', style: 'header' },
                { text: `Fecha: ${date}`, style: 'subheader' },

                { text: 'Resumen Ejecutivo', style: 'sectionHeader' },
                { text: resumen || "No hay resumen disponible.", margin: [0, 5, 0, 15] },

                { text: 'Métricas Clave (KPIs)', style: 'sectionHeader' },
                {
                    table: {
                        widths: ['*', 'auto', 'auto'],
                        body: [
                            [{ text: 'Métrica', style: 'tableHeader' }, { text: 'Valor', style: 'tableHeader' }, { text: 'Estado', style: 'tableHeader' }],
                            ...(metrias || []).map(m => [
                                m.label,
                                m.value,
                                { text: m?.status?.toUpperCase() || 'INFO', color: getStatusColor(m?.status), bold: true }
                            ])
                        ]
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 5, 0, 15]
                },

                ...(data.charts && data.charts.length > 0 ? [
                    { text: 'Visualizaciones', style: 'sectionHeader' },
                    { text: `Este reporte incluye ${data.charts.length} gráfica(s) interactiva(s). Para verlas, consulte la versión digital.`, margin: [0, 5, 0, 15], italics: true, color: '#7f8c8d' }
                ] : []),

                { text: 'Conclusión Estratégica', style: 'sectionHeader' },
                { text: conclusion || "No hay conclusión disponible.", margin: [0, 5, 0, 15] }
            ],
            styles: {
                header: { fontSize: 22, bold: true, alignment: 'center', margin: [0, 0, 0, 10], color: '#2c3e50' },
                subheader: { fontSize: 12, alignment: 'center', margin: [0, 0, 0, 20], color: '#7f8c8d' },
                sectionHeader: { fontSize: 16, bold: true, margin: [0, 10, 0, 5], color: '#34495e', decoration: 'underline' },
                tableHeader: { bold: true, fontSize: 13, color: 'black', fillColor: '#ecf0f1' }
            },
            defaultStyle: { font: 'Roboto' }
        };
        pdfMake.createPdf(docDefinition).download(`Reporte_Analisis_${Date.now()}.pdf`);
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'ok': return 'green';
            case 'warning': return 'orange';
            case 'critical': return 'red';
            default: return 'gray';
        }
    };

    const getBadgeColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'ok': return 'success';
            case 'warning': return 'warning';
            case 'critical': return 'danger';
            default: return 'secondary';
        }
    };

    return (
        <CCard className="h-100 shadow-sm border-0 d-flex flex-column">
            <CCardHeader className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <strong className="text-primary">📄 Reporte de Análisis</strong>
                <CButton color="primary" size="sm" onClick={handleDownloadPdf}>
                    <span className="me-2">⬇️</span> Descargar PDF
                </CButton>
            </CCardHeader>
            <CCardBody className="p-4 flex-grow-1 bg-light overflow-auto">
                {/* Resumen Section */}
                <div className="mb-4">
                    <h5 className="text-secondary border-bottom pb-2 mb-3">Resumen Ejecutivo</h5>
                    <CAlert color="info" className="border-0 shadow-sm bg-white text-dark">
                        {resumen || "Esperando resumen..."}
                    </CAlert>
                </div>

                {/* Metrics Section */}
                <div className="mb-4">
                    <h5 className="text-secondary border-bottom pb-2 mb-3">Métricas Clave</h5>
                    <div className="table-responsive bg-white rounded shadow-sm p-3">
                        <table className="table table-hover mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Métrica</th>
                                    <th>Valor</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(metrias || []).map((m, idx) => (
                                    <tr key={idx}>
                                        <td className="fw-semibold">{m.label}</td>
                                        <td>{m.value}</td>
                                        <td>
                                            <span className={`badge bg-${getBadgeColor(m.status)}`}>
                                                {m.status?.toUpperCase() || 'INFO'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {(!metrias || metrias.length === 0) && (
                                    <tr>
                                        <td colSpan="3" className="text-center text-muted">No hay métricas disponibles</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Charts Section */}
                {data.charts && data.charts.length > 0 && (
                    <div className="mb-4">
                        <h5 className="text-secondary border-bottom pb-2 mb-3">📊 Visualizaciones</h5>
                        {data.charts.map((chart, idx) => (
                            <VegaChartRenderer
                                key={idx}
                                title={chart.title}
                                spec={chart.spec}
                            />
                        ))}
                    </div>
                )}

                {/* Conclusion Section */}
                <div>
                    <h5 className="text-secondary border-bottom pb-2 mb-3">Conclusión Estratégica</h5>
                    <div className="bg-white p-3 rounded shadow-sm border-start border-4 border-success">
                        <p className="mb-0 fs-5">{conclusion || "Sin conclusiones."}</p>
                    </div>
                </div>
            </CCardBody>
        </CCard>
    );
};

export default Reporte;
