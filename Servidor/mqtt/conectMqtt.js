// mqttConectar.js
const mqtt = require('mqtt');
const SvmService = require('../services/SvmService');
const socketService = require('../services/SocketService');

const fs = require('fs');
const path = require('path');

const brokerUrl = process.env.BROKER || 'mqtt://localhost:1883';
const isSecure = brokerUrl.startsWith('mqtts') || brokerUrl.startsWith('wss');

const options = {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  clientId: "NodeClient_" + Math.random().toString(16).substr(2, 8),
  // Solo aplicar certificados si la URL es segura (mqtts/wss)
  ...(isSecure && {
    key: (process.env.TLS_KEY_PATH && fs.existsSync(process.env.TLS_KEY_PATH)) ? fs.readFileSync(process.env.TLS_KEY_PATH) : undefined,
    cert: (process.env.TLS_CERT_PATH && fs.existsSync(process.env.TLS_CERT_PATH)) ? fs.readFileSync(process.env.TLS_CERT_PATH) : undefined,
    ca: (process.env.TLS_CA_PATH && fs.existsSync(process.env.TLS_CA_PATH)) ? fs.readFileSync(process.env.TLS_CA_PATH) : undefined,
    rejectUnauthorized: process.env.MQTT_REJECT_UNAUTHORIZED === 'true',
  })
};

// Lista de topics
const topics = [ 
  'Plc/Esp32',
];

// Buffer para los últimos N mensajes
const MAX_MENSAJES = 1000;
const mensajesPorTopic = {}; // { topic: [ { msg, timestamp } ] }

// Buffer para valores ADC (para visualizador en tiempo real)
const MAX_ADC_VALUES = 100;
const adcBuffer = [];

let mqttClient;

function connect() {
  mqttClient = mqtt.connect(brokerUrl, options);

  mqttClient.on('connect', () => {
    console.log('Conectado al broker MQTT');

    topics.forEach(topic => {
      mqttClient.subscribe(topic, { qos: 1 }, (err) => {
        if (!err) console.log(`📡 Suscrito a ${topic}`);
        else console.error(`❌ Error suscribiéndose a ${topic}:`, err);
      });
    });
  });

  mqttClient.on('message', (topic, message) => {
    const msgString = message.toString();
    // console.log(`📥 [${topic}] => ${msgString}`);

    // Procesamiento SVM
    try {
      const data = JSON.parse(msgString);
      // console.log("🔍 [MQTT Payload]", JSON.stringify(data, null, 2));
      
      // Verificamos si tiene la estructura esperada: data.data.deviceADCValue
      if (data && data.data && data.data.deviceADCValue !== undefined) {
        const adcValue = data.data.deviceADCValue;
        const deviceId = data.deviceMqttId || "UNKNOWN_DEVICE"; // Extraer ID

        // PRIORIDAD MÁXIMA: Emitir al frontend INMEDIATAMENTE
        const currentDataPoint = {
          id: Date.now(),
          voltaje: adcValue,
          timestamp: Date.now(),
          device_uid: deviceId
        };
        socketService.emit('mcpdatos', currentDataPoint);
        // console.log(`⚡ [FAST] Emitido: ${adcValue} | Dev: ${deviceId}`);
        
        // Procesamiento SVM (Async - No bloquea)
        SvmService.addSample(adcValue, deviceId).then(result => {
           if (result) {
              // Notificar anomalía en tiempo real
              if (result.savedRecord && result.savedRecord.resultado?.isAnomaly) {
                 socketService.emit('new_anomaly', result.savedRecord);
                 console.log("🚨 Evento 'new_anomaly' emitido!");
              }

              if (result.status === "collecting") {
                  console.log(`🧠 [IA] Aprendiendo... (${result.count}/10 lotes)`);
              } 
           }
        });

        // Buffer para visualizador (Legacy/Backend logic)
        adcBuffer.push({
          value: adcValue,
          timestamp: Date.now(),
          deviceId: deviceId
        });

        if (adcBuffer.length > MAX_ADC_VALUES) {
          adcBuffer.shift();
        }
      }
    } catch (e) {
      console.error("Error parseando JSON MQTT:", e.message);
    }


    if (!mensajesPorTopic[topic]) mensajesPorTopic[topic] = [];
    mensajesPorTopic[topic].push({ msg: msgString, timestamp: Date.now() });

    if (mensajesPorTopic[topic].length > MAX_MENSAJES) {
      mensajesPorTopic[topic].shift();
    }
  });

  mqttClient.on('error', (err) => {
    console.error('Error MQTT:', err);
  });
}

// Publicar mensajes
function publicarMQTT(topic, mensaje) {
  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(topic, mensaje, { qos: 1 }, (err) => {
      if (err) console.error(`❌ Error al publicar en ${topic}:`, err);
      else console.log(`📤 Publicado en ${topic}: ${mensaje}`);
    });
  } else {
    console.log('⚠️ Cliente MQTT no conectado');
  }
}

module.exports = {
  connect,
  mqttClient,
  publicarMQTT,
  mensajesPorTopic
};
