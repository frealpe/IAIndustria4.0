// hook/mqtt/useMqtt.js
import { useEffect, useState, useCallback } from "react";
import mqtt from "mqtt";

// 🔹 Configuración del broker
const BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL || "ws://localhost:8083";
const MQTT_USER = "plcuser";
const MQTT_PASS = "plc";

// 🔹 Lista global de tópicos
export const topics = [
  "Plc/Adc",
  "Plc/Ia",
  "Plc/Pwm",
  "Plc/Timer",
  "Plc/Control",
  "Plc/Caracterizacion",
  "Plc/Supervisor",
  "Plc/Respuesta",
  "Plc/Petri",
  "Plc/Comparacion",
  "Plc/ControlIA",
  "hms/recurso/+/estado",
  "hms/recurso/+/oferta",
  "hms/mision/comando",
];

export const useMqtt = () => {
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);

  // 🧩 Conexión al broker MQTT
  useEffect(() => {
    console.log("🔌 Conectando al broker MQTT:", BROKER_URL);

    const mqttClient = mqtt.connect(BROKER_URL, {
      username: MQTT_USER,
      password: MQTT_PASS,
      reconnectPeriod: 2000,
      clean: true,
    });

    mqttClient.on("connect", () => {
      console.log("✅ Conectado al broker MQTT");
      setConnected(true);
    });

    mqttClient.on("error", (err) => {
      console.error("⚠️ Error MQTT:", err.message);
      setConnected(false);
    });

    mqttClient.on("close", () => {
      console.warn("🔌 Conexión MQTT cerrada");
      setConnected(false);
    });

    setClient(mqttClient);

    // 🔹 Cierre limpio
    return () => mqttClient.end(true);
  }, []);

  // 📤 Publicar mensaje
  const publish = useCallback(
    (topic, message) => {
      if (!client || !connected) {
        console.warn("⚠️ No se puede publicar: cliente MQTT no conectado");
        return;
      }
      const payload =
        typeof message === "string" ? message : JSON.stringify(message);
      client.publish(topic, payload);
      console.log(`📤 Publicado en ${topic}:`, message);
    },
    [client, connected]
  );

  // 📡 Suscribirse con callback
  const subscribe = useCallback(
    (topic, callback) => {
      if (!client || !connected) {
        console.warn("⚠️ No se puede suscribir: cliente MQTT no conectado");
        return;
      }

      client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) console.error(`❌ Error al suscribirse a ${topic}:`, err.message);
        else console.log(`📡 Suscrito a ${topic}`);
      });

        const handler = (receivedTopic, message) => {
          try {
            // Normaliza los patrones de coincidencia con '+'
            const topicRegex = new RegExp(
              "^" + topic.replace("+", "[^/]+").replace("#", ".+") + "$"
            );

            if (topicRegex.test(receivedTopic)) {
              const text = message.toString();
              const data = JSON.parse(text);
              callback(data, receivedTopic);
            }
          } catch (e) {
            console.error(`⚠️ Error procesando mensaje en ${receivedTopic}:`, e);
          }
        };


      client.on("message", handler);

      // 🔹 Cleanup
      return () => {
        client.removeListener("message", handler);
        client.unsubscribe(topic);
      };
    },
    [client, connected]
  );

  // 🔹 Suscripción automática a tópicos del sistema
  useEffect(() => {
    if (connected && client) {
      topics.forEach((t) => {
        client.subscribe(t, { qos: 1 }, (err) => {
          if (err) console.error(`❌ Error al suscribirse a ${t}`);
          else console.log(`✅ Suscrito automáticamente a: ${t}`);
        });
      });
    }
  }, [connected, client]);

  return { client, connected, publish, subscribe, topics };
};
