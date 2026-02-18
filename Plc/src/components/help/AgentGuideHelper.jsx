import React, { useState } from 'react';
import {
    CAccordion,
    CAccordionItem,
    CAccordionHeader,
    CAccordionBody,
    CBadge,
    CAlert
} from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import { cilCopy, cilCheckAlt } from '@coreui/icons';

const AgentGuideHelper = () => {
    const [copiedIndex, setCopiedIndex] = useState(null);

    const copyToClipboard = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const promptCategories = [
        {
            title: '📋 Consultas Básicas SQL',
            agent: 'SQL_EXPERT',
            color: 'primary',
            description: 'Consultas directas y listados simples de datos',
            prompts: [
                '¿Qué dispositivos están registrados en el sistema?',
                'Muéstrame todos los datos del dispositivo Planta 1',
                'Dame los últimos 50 registros de la base de datos',
                '¿Cuántos registros hay en total en la tabla de datos?',
                'Muestra los datos registrados hoy',
                'Dame todos los datos del ESP32-001 de los últimos 7 días',
            ]
        },
        {
            title: '📊 Análisis Estadístico',
            agent: 'DATA_SCIENTIST',
            color: 'success',
            description: 'Análisis avanzados con cálculos estadísticos',
            prompts: [
                '¿Cuál es el voltaje promedio (mean), mínimo y máximo del dispositivo "Planta 1"?',
                'Calcula la desviación estándar de la señal ADC para los últimos 500 registros',
                'Analiza los últimos 100 registros de Planta1. Calcula el promedio y la desviación estándar del voltaje, y genera una gráfica de distribución (histograma) de los valores.',
                'Calcula el coeficiente de variación del voltaje para determinar la estabilidad',
            ]
        },
        {
            title: '📈 Tendencias y Regresión',
            agent: 'DATA_SCIENTIST',
            color: 'success',
            description: 'Análisis de tendencias temporales y predicciones',
            prompts: [
                '¿El voltaje está aumentando o disminuyendo con el tiempo? Muestra la tendencia',
                'Calcula la regresión lineal del voltaje en el tiempo y dame el coeficiente R²',
                'Obtén los últimos 200 registros y calcula una media móvil de la señal ADC. Muéstrame el resultado en una gráfica de líneas.',
                'Muestra la tendencia del voltaje de los últimos 200 registros. Crea un gráfico de líneas que muestre cómo ha variado el voltaje en el tiempo y dime si observas alguna inestabilidad.',
                'Calcula el promedio móvil de 10 puntos del voltaje y grafícalo',
            ]
        },
        {
            title: '🚨 Detección de Anomalías',
            agent: 'DATA_SCIENTIST',
            color: 'warning',
            description: 'Identificación y análisis de datos anómalos',
            prompts: [
                '¿Cuántas anomalías se han detectado en la última semana?',
                'Crea un gráfico de barras que compare cuántas anomalías se han detectado frente a registros normales usando el campo isAnomaly.',
                'Busca las anomalías registradas en la última hora. Genera un resumen estadístico que incluya el total de datos, cuántos son anomalías y el porcentaje de error. Acompaña el análisis con una gráfica de dispersión resaltando los puntos fuera de rango.',
                '¿Qué dispositivo tiene la tasa más alta de anomalías?',
                'Identifica outliers usando el método IQR y muéstralos en un gráfico',
            ]
        },
        {
            title: '📉 Visualizaciones',
            agent: 'DATA_SCIENTIST',
            color: 'info',
            description: 'Gráficas y visualizaciones de datos',
            prompts: [
                'Analiza los últimos 100 registros de la tabla datos. Genera una gráfica de líneas que muestre el valor mean a lo largo del tiempo.',
                'Crea un gráfico comparando el voltaje (mean) de todos los dispositivos registrados',
                'Muestra un boxplot del voltaje (mean) agrupado por dispositivo',
                'Crea un gráfico de barras mostrando el número de anomalías por dispositivo',
            ]
        },
        {
            title: '🎯 Casos Especiales',
            agent: 'BOTH',
            color: 'secondary',
            description: 'Consultas complejas y casos de uso avanzados',
            prompts: [
                '¿Cómo está funcionando el sistema?',
                '¿Cual dispositivo funciona mejor?',
                '¿Hay algún problema con los sensores actualmente?',
                'Compara el comportamiento del voltaje entre los registros de esta mañana y los de hace una hora. Estadísticamente, ¿cuál periodo fue más estable? Genera una gráfica comparativa.',
                'Compara las métricas de todos los dispositivos y crea una tabla resumen',
            ]
        }
    ];

    return (
        <div className="agent-guide-helper">
            <CAlert color="info" className="mb-4">
                <h5>💡 Guía de Uso del Asistente IA</h5>
                <p className="mb-0">
                    Haz clic en cualquier prompt para copiarlo al portapapeles y úsalo en el Asistente.
                    Los badges indican qué agente se activará para procesar tu consulta.
                </p>
            </CAlert>

            <div className="mb-3">
                <CBadge color="primary" className="me-2">SQL Expert</CBadge>
                <span className="text-muted small">Consultas directas y listados</span>
            </div>
            <div className="mb-4">
                <CBadge color="success" className="me-2">Data Scientist</CBadge>
                <span className="text-muted small">Análisis avanzados y visualizaciones</span>
            </div>

            <CAccordion activeItemKey={1}>
                {promptCategories.map((category, catIndex) => (
                    <CAccordionItem key={catIndex} itemKey={catIndex + 1}>
                        <CAccordionHeader>
                            <strong>{category.title}</strong>
                            <CBadge
                                color={category.color}
                                className="ms-2"
                                style={{ fontSize: '0.7rem' }}
                            >
                                {category.agent === 'BOTH' ? 'Ambos' : category.agent.replace('_', ' ')}
                            </CBadge>
                        </CAccordionHeader>
                        <CAccordionBody>
                            <p className="text-muted mb-3">{category.description}</p>
                            <div className="prompt-list">
                                {category.prompts.map((prompt, promptIndex) => {
                                    const globalIndex = `${catIndex}-${promptIndex}`;
                                    return (
                                        <div
                                            key={promptIndex}
                                            className="prompt-item p-3 mb-2 border rounded"
                                            onClick={() => copyToClipboard(prompt, globalIndex)}
                                            style={{
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                backgroundColor: copiedIndex === globalIndex ? '#d1f2eb' : '#f8f9fa'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (copiedIndex !== globalIndex) {
                                                    e.currentTarget.style.backgroundColor = '#e9ecef';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (copiedIndex !== globalIndex) {
                                                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                                                }
                                            }}
                                        >
                                            <div className="d-flex justify-content-between align-items-center">
                                                <span>{prompt}</span>
                                                <CIcon
                                                    icon={copiedIndex === globalIndex ? cilCheckAlt : cilCopy}
                                                    size="sm"
                                                    style={{ color: copiedIndex === globalIndex ? '#28a745' : '#6c757d' }}
                                                />
                                            </div>
                                            {copiedIndex === globalIndex && (
                                                <small className="text-success d-block mt-1">✓ Copiado al portapapeles</small>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CAccordionBody>
                    </CAccordionItem>
                ))}
            </CAccordion>
        </div>
    );
};

export default AgentGuideHelper;
