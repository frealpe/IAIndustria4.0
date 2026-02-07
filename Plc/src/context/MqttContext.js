// context/MqttContext.jsx
import React, { createContext, useState, useEffect } from "react";
import { useMqtt } from "../hook/mqtt/useMqtt";

// 🔹 Crear contexto
export const MqttContext = createContext({
  client: null,
  connected: false,
  publish: () => {},
  recursos: {},
  ordenes: [],
  logs: [],
});

// 🔹 Proveedor
export const MqttProvider = ({ children }) => {
  const { client, connected, publish, subscribe } = useMqtt();

  const [recursos, setRecursos] = useState({});
  const [ordenes, setOrdenes] = useState([]);
  const [logs, setLogs] = useState([]); // 🆕 historial de eventos

  // 🧠 Función para agregar logs con límite
  const addLog = (msg) => {
    setLogs((prev) => {
      const nuevo = [...prev, msg];
      return nuevo.slice(-50); // mantiene solo los últimos 50 eventos
    });
  };

  useEffect(() => {
    if (!connected || !client) return;
    console.log("🧠 Subscripciones activas...");

    // 🔹 Estado de los recursos
    const unsubEstado = subscribe("hms/recurso/+/estado", (data, topic) => {
      const id = topic.split("/")[2];
      setRecursos((prev) => {
        const prevRecurso = prev[id] || {};
        return {
          ...prev,
          [id]: {
            ...prevRecurso,
            id,
            estado: data.estado ?? prevRecurso.estado ?? "Desconocido",
            competencia: data.competencia ?? prevRecurso.competencia ?? "N/A",
            carga: data.carga ?? prevRecurso.carga ?? 0,
            timestamp: data.timestamp ?? new Date().toISOString(),
            ofertas: prevRecurso.ofertas || [],
          },
        };
      });

      addLog(`📘 Estado recibido de ${id}: ${data.estado}`);
    });

    // 🔹 Ofertas de recursos
    const unsubOferta = subscribe("hms/recurso/+/oferta", (data, topic) => {
      const id = topic.split("/")[2];
      setRecursos((prev) => {
        const prevRecurso = prev[id] || { ofertas: [] };
        return {
          ...prev,
          [id]: {
            ...prevRecurso,
            id,
            ofertas: [...(prevRecurso.ofertas || []), data],
          },
        };
      });

      addLog(`📨 Oferta recibida de ${id} → ${data.tiempo_estimado || "?"}s`);
    });

    // 🔹 Comandos del servidor
    const unsubComando = subscribe("hms/mision/comando", (data) => {
      setOrdenes((prev) => [...prev, data]);
      addLog(`📡 Mensaje recibido en hms/mision/comando: ${data.tipo_msg}`);

      // 🟢 Eventos especiales
      if (data.tipo_msg === "AdO") {
        addLog(`✅ ${data.recurso_asignado} adjudicado para ${data.id_orden}`);
      } else if (data.tipo_msg === "Rechazo") {
        addLog(`❌ Rechazada oferta de ${data.id} para ${data.id_orden}`);
      } else if (data.tipo_msg === "Ignorar") {
        addLog(`⚠️ ${data.id} ignoró la tarea ${data.id_orden}`);
      }
    });

    return () => {
      unsubEstado?.();
      unsubOferta?.();
      unsubComando?.();
    };
  }, [connected, client, subscribe]);

  return (
    <MqttContext.Provider
      value={{
        client,
        connected,
        publish,
        recursos,
        ordenes,
        logs,
      }}
    >
      {children}
    </MqttContext.Provider>
  );
};
