// mqttConectar.js
const mqtt = require('mqtt');
const SvmService = require('../services/SvmService');
const socketService = require('../services/SocketService');

const brokerUrl = process.env.BROKER;
const options = {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  clientId: "NodeClient_" + Math.random().toString(16).substr(2, 8),
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
    console.log(`📥 [${topic}] => ${msgString}`);

    // Procesamiento SVM
    try {
      const data = JSON.parse(msgString);
      
      // Verificamos si tiene la estructura esperada: data.data.deviceADCValue
      if (data && data.data && data.data.deviceADCValue !== undefined) {
        const adcValue = data.data.deviceADCValue;
        const deviceId = data.deviceMqttId || "UNKNOWN_DEVICE"; // Extraer ID
        
        // Enviamos al servicio SVM (ahora es Async porque puede entrenar)
        SvmService.addSample(adcValue, deviceId).then(result => {
           if (result) {
              // Notificar anomalía en tiempo real
              if (result.savedRecord && result.savedRecord.resultado?.isAnomaly) {
                 socketService.emit('new_anomaly', result.savedRecord);
                 console.log("🚨 Evento 'new_anomaly' emitido!");
              }

              if (result.status === "collecting") {
                  console.log(`🧠 [IA] Aprendiendo... (${result.count}/10 lotes)`);
              } else if (result.status === "inference") {
                  // Ya está detectando anomalías
              }
           }
        });

        // Agregar valor ADC al buffer para visualizador
        adcBuffer.push({
          value: adcValue,
          timestamp: Date.now(),
          deviceId: deviceId
        });

        // Mantener solo los últimos MAX_ADC_VALUES valores
        if (adcBuffer.length > MAX_ADC_VALUES) {
          adcBuffer.shift();
        }

        // Formatear el dato actual
        const currentDataPoint = {
          id: Date.now(), // ID único (timestamp)
          voltaje: adcValue,
          timestamp: Date.now(),
          deviceId: deviceId
        };

        // Agregar al buffer local (opcional, por si alguien pide histórico)
        adcBuffer.push(currentDataPoint);
        if (adcBuffer.length > MAX_ADC_VALUES) adcBuffer.shift();

        // Emitir SOLO el dato nuevo al frontend
        socketService.emit('mcpdatos', currentDataPoint);
        console.log(`📊 Emitiendo dato individual ADC: ${adcValue}`);
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
