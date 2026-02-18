import React from "react";
import Markdown from "react-markdown";
import VegaChart from "../graficos/VegaChart";
import { CBadge, CCard, CCardBody, CRow, CCol } from "@coreui/react-pro";

function GptMessage({ text, data }) {
  // Función para determinar el color del badge según el status
  const getStatusColor = (status) => {
    const map = {
      ok: "success",
      warning: "warning",
      danger: "danger",
      info: "info"
    };
    return map[status] || "secondary";
  };

  return (
    <div className="col-start-1 col-end-9 p-3 rounded-lg">
      <div className="flex flex-row items-start">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-600 flex-shrink-0 text-white font-bold">
          A
        </div>
        <div className="relative ml-3 text-sm bg-white pt-3 pb-2 px-4 shadow-sm border rounded-xl w-100">

          {/* Si hay data estructurada, la mostramos de forma especial */}
          {data && (typeof data === 'object') ? (
            <div className="agent-structured-response">
              {console.log("📌 [GptMessage] Data received:", data)}
              {console.log("📌 [GptMessage] Visualization present:", !!data.visualization)}

              {/* [NEW] Visualization from Data Scientist Agent */}
              {data.visualization && (
                <div className="mb-3 border rounded p-2 bg-white">
                  <div className="fw-bold mb-2 text-primary" style={{ fontSize: '13px' }}>
                    📊 Visualización Generada
                  </div>
                  <VegaChart spec={data.visualization} />
                </div>
              )}

              {/* Resumen Principal */}
              <div className="mb-3">
                <Markdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const isJson = match && (match[1] === "json" || match[1] === "vega");
                      if (!inline && isJson) {
                        try {
                          const json = JSON.parse(String(children).replace(/\n$/, ""));
                          if (json.$schema && json.$schema.includes("vega-lite")) {
                            return <VegaChart spec={json} />;
                          }
                        } catch (e) { }
                      }
                      return <code className={className} {...props}>{children}</code>;
                    },
                  }}
                >
                  {data.resumen || text}
                </Markdown>
              </div>

              {/* Grilla de Métricas */}
              {data.metrias && data.metrias.length > 0 && (
                <CRow className="g-2 mb-3">
                  {data.metrias.map((m, idx) => (
                    <CCol xs={6} md={4} key={idx}>
                      <div className="p-2 border rounded bg-light text-center">
                        <div style={{ fontSize: '10px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>{m.label}</div>
                        <div className="d-flex align-items-center justify-content-center gap-1">
                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{m.value}</span>
                          {m.status && <CBadge color={getStatusColor(m.status)} shape="rounded-pill" style={{ width: '8px', height: '8px', padding: 0 }}> </CBadge>}
                        </div>
                      </div>
                    </CCol>
                  ))}
                </CRow>
              )}

              {/* Gráfica si viene por separado (legacy) */}
              {data.grafica && (
                <div className="mb-3 border rounded p-2 bg-white">
                  <VegaChart spec={data.grafica} />
                </div>
              )}


              {/* Gráficas Vega-Lite (nuevo formato charts array) */}
              {data.charts && Array.isArray(data.charts) && data.charts.length > 0 && (
                <div className="mb-3">
                  {console.log("📊 [GptMessage] Rendering", data.charts.length, "charts")}
                  {data.charts.map((chart, idx) => {
                    console.log(`📊 [GptMessage] Chart ${idx}:`, chart);
                    return (
                      <div key={idx} className="mb-2 border rounded p-2 bg-white">
                        {chart.title && (
                          <div className="fw-bold mb-2 text-primary" style={{ fontSize: '13px' }}>
                            📊 {chart.title}
                          </div>
                        )}
                        <VegaChart spec={chart.spec} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Conclusión / Recomendación */}
              {data.conclusion && (
                <CCard className="border-start border-start-4 border-start-info bg-info bg-opacity-10 mb-2">
                  <CCardBody className="p-2 italic">
                    <strong>💡 Recomendación:</strong> {data.conclusion}
                  </CCardBody>
                </CCard>
              )}
            </div>
          ) : (
            /* Fallback a Markdown normal */
            <Markdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const isJson = match && (match[1] === "json" || match[1] === "vega");

                  if (!inline && isJson) {
                    try {
                      const content = String(children).replace(/\n$/, "");
                      const json = JSON.parse(content);
                      if (json.$schema && json.$schema.includes("vega-lite")) {
                        return <VegaChart spec={json} />;
                      }
                    } catch (e) { }
                  }

                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {text}
            </Markdown>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(GptMessage);
