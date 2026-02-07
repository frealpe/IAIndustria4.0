#include "mcp_header.hpp"
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>

// Helper for Time String (if not defined elsewhere)
// String longTimeStr(const unsigned long &t) {
//   char s[20]; // 00:00:00
//   sprintf(s, "%02lu:%02lu:%02lu", (t / 3600) % 24, (t / 60) % 60, t % 60);
//   return String(s);
// }

// -------------------------------------------------------------------
// Definir valores a las variables MQTT
// Mensajes de última voluntad
// -------------------------------------------------------------------
// Asumiendo mqtt_user definido en mcp_header.hpp
String mqtt_willTopic = PathMqttTopic("Plc/Esp32");
String mqtt_willMessage =
    "{\"connected\": false, \"username\": \"" + String(mqtt_user) + "\" }";
int mqtt_willQoS = 0;
boolean mqtt_willRetain = false;

// WiFiClient espClient; // Usamos espClient como estaba en mcp_mqtt.hpp
// original o cambiamos a wifiClient? El original usaba espClient, pero el nuevo
// usa wifiClient. Vamos a mantener espClient si wifiClient no esta Pero mejor
// usamos wifiClient para ser consistentes con el nuevo código si es posible.
// Sin embargo, mcp_header.hpp no tiene wifiClient.
// Vamos a usar 'espClient' que estaba declarado en el archivo original, pero lo
// renombramos a 'wifiClient' para pegar el codigo mas facil? No, mejor
// declaramos wifiClient para ser 100% igual al codigo copiado.
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

char topic[150];
String mqtt_data = "";

long lastMqttReconnectAttempt = 0;
long lasMsg = 0;

// -------------------------------------------------------------------
// DEFINICION DE FUNCIONES
// -------------------------------------------------------------------
boolean mqtt_connect();
void callback(char *topic, byte *payload, unsigned int length);
void mqttloop();
void mqtt_publish();
String Json();
void mqtt_response(String method, String type, String msg, String value);
// void apiPostRestart(String origin); // Comentado si no existe
// void apiPostRestore(String origin); // Comentado si no existe

// -------------------------------------------------------------------
// MQTT Connect
// -------------------------------------------------------------------
boolean mqtt_connect() {
  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setCallback(callback);
  log("MQTT: Intentando conexión al Broker MQTT...");

  if (mqttClient.connect(mqtt_cloud_id, mqtt_user, mqtt_password,
                         mqtt_willTopic.c_str(), mqtt_willQoS, mqtt_willRetain,
                         mqtt_willMessage.c_str())) {
    log("INFO: Conectado al Broker MQTT -> " + String(mqtt_server));

    mqttClient.setBufferSize(1024 * 5);
    log("INFO: Buffer MQTT Size: " + String(mqttClient.getBufferSize()) +
        " Bytes");

    String topic_subscribe = String(mqtt_topic);
    topic_subscribe.toCharArray(topic, 150);

    if (mqttClient.subscribe(topic)) {
      log("INFO: Suscrito al tópico: " + String(topic));
    } else {
      log("ERROR: MQTT - Falló la suscripción");
    }

    String mqtt_willMessageCon =
        "{\"connected\": true, \"username\": \"" + String(mqtt_user) + "\" }";
    mqttClient.publish(mqtt_willTopic.c_str(), mqtt_willMessageCon.c_str());
  } else {
    log("ERROR: MQTT - Falló, código de error = " + String(mqttClient.state()));
    return (0);
  }
  return (1);
}

// -------------------------------------------------------------------
// Manejo de los Mensajes Entrantes
// -------------------------------------------------------------------
void callback(char *topic, byte *payload, unsigned int length) {
  String command = "";
  String str_topic(topic);

  for (int16_t i = 0; i < length; i++) {
    command += (char)payload[i];
  }

  command.trim();
  log("INFO: MQTT Tópico  --> " + str_topic);
  log("INFO: MQTT Mensaje --> " + command);

  DynamicJsonDocument JsonCommand(1024);
  DeserializationError error = deserializeJson(JsonCommand, command);

  if (error) {
    mqtt_response("Desconocido", "Desconocido", "",
                  "{\"msg\": \"¡Error, no es un formato JSON!\"}");
    return;
  }

  // Ignorar mensajes propios (evitar bucle infinito)
  if (JsonCommand.containsKey("deviceMqttId")) {
    return;
  }

  if (!JsonCommand.containsKey("method") || !JsonCommand.containsKey("type")) {
    mqtt_response("Desconocido", "Desconocido", "",
                  "{\"msg\": \"¡Error, formato JSON no soportado!\" }");
    return;
  }

  // Manejo de Comandos
  if (strcmp(JsonCommand["method"], "POST") == 0 &&
      strcmp(JsonCommand["type"], "RELAYS") == 0) {
    // {"method": "POST", "type": "RELAYS", "data":{"protocol": "MQTT",
    // "output": "RELAY1", "value": false }}
    if (apiPostOnOffRelays(JsonCommand["data"])) {
      if (settingsSave()) {
        mqtt_response(JsonCommand["method"], JsonCommand["type"],
                      JsonCommand["data"]["output"], "{\"value\": true}");
        mqtt_publish();
      }
    } else {
      if (settingsSave()) {
        mqtt_response(JsonCommand["method"], JsonCommand["type"],
                      JsonCommand["data"]["output"], "{\"value\": false}");
        mqtt_publish();
      }
    }
  } else if (strcmp(JsonCommand["method"], "POST") == 0 &&
             strcmp(JsonCommand["type"], "DIMMER") == 0) {
    // {"method": "POST", "type": "DIMMER", "data":{"protocol": "MQTT",
    // "output": "Dimmer", "value": 50 }}
    apiPostDimmer(JsonCommand["data"]);
    // respuesta al cliente MQTT
    mqtt_response(JsonCommand["method"], JsonCommand["type"],
                  JsonCommand["data"]["output"],
                  "{ \"value\":" + String(dim) + "}");
    mqtt_publish();
  } else if (strcmp(JsonCommand["method"], "POST") == 0 &&
             strcmp(JsonCommand["type"], "RESTART") == 0) {
    // CONFIGURAR EL MQTT MEDIANTE POST
    // {"method": "POST", "type": "RESTART", "origin": "MQTT"}
    // llamar la funcion con los datos
    mqtt_response(JsonCommand["method"], JsonCommand["type"], "",
                  F("{\"restart\": true}"));
    delay(100);
    apiPostRestart(JsonCommand["origin"]);
  } else if (strcmp(JsonCommand["method"], "POST") == 0 &&
             strcmp(JsonCommand["type"], "RESTORE") == 0) {
    // CONFIGURAR EL MQTT MEDIANTE POST
    // {"method": "POST", "type": "RESTORE", "origin": "MQTT"}
    // llamar la funcion con los datos
    mqtt_response(JsonCommand["method"], JsonCommand["type"], "",
                  F("{\"restore\": true}"));
    delay(100);
    apiPostRestore(JsonCommand["origin"]);
  } else {
    mqtt_response("Desconocido", "Desconocido", "",
                  "{ \"msg\": \"¡Error, no es un comando soportado!\" }");
  }
}

// -------------------------------------------------------------------
// Manejo de los Mensajes de respuesta
// -------------------------------------------------------------------
void mqtt_response(String method, String type, String msg, String value) {
  String data = "";
  DynamicJsonDocument jsonDoc(10240);
  DynamicJsonDocument jsonData(10240);
  deserializeJson(jsonData, value);

  jsonDoc["method"] = method;
  jsonDoc["type"] = type;
  JsonObject dataObj = jsonDoc.createNestedObject("data");
  dataObj["msg"] = msg;
  dataObj["value"] = jsonData;
  serializeJson(jsonDoc, data);

  String topic = "Plc/Esp32"; // Simulando PathMqttTopic("response")
  mqttClient.publish(topic.c_str(), data.c_str());
}

// -------------------------------------------------------------------
// Manejo de los Mensajes Salientes
// -------------------------------------------------------------------
void mqtt_publish() {
  String topic = String(mqtt_topic);
  mqtt_data = Json();
  mqttClient.publish(topic.c_str(), mqtt_data.c_str());
  mqtt_data = "";
}

// -------------------------------------------------------------------
// JSON con información del Dispositivo
// -------------------------------------------------------------------
String Json() {
  String response;
  DynamicJsonDocument jsonDoc(3000);
  readSensor();
  // jsonDoc["deviceMqttId"] = mqtt_cloud_id;
  jsonDoc["deviceMqttId"] = mqtt_cloud_id;
  // jsonDoc["deviceSerial"] = deviceID();
  // jsonDoc["deviceManufacturer"] = device_manufacturer;
  // jsonDoc["deviceFwVersion"] = device_fw_version;
  // jsonDoc["deviceHwVersion"] = device_hw_version;
  // jsonDoc["deviceSdk"] = ESP.getSdkVersion();
  JsonObject dataObj = jsonDoc.createNestedObject("data");
  // dataObj["deviceRamSizeKB"] = ESP.getHeapSize() / 1024;
  // dataObj["deviceRamAvailableKB"] = ESP.getFreeHeap() / 1024;
  // dataObj["deviceSpiffsSizeKB"] = SPIFFS.totalBytes() / 1024;
  // dataObj["deviceSpiffsUsedKB"] = SPIFFS.usedBytes() / 1024;
  // dataObj["deviceActiveTimeSeconds"] = longTimeStr(millis() / 1000);
  // dataObj["deviceCpuClockMhz"] = getCpuFrequencyMhz();
  // dataObj["deviceFlashSizeMB"] = ESP.getFlashChipSize() / (1024.0 * 1024);
  // Valores Hardware Reales
  // dataObj["deviceRelay1Status"] = RELAY1_STATUS ? true : false;
  // dataObj["deviceRelay2Status"] = RELAY2_STATUS ? true : false;
  // dataObj["deviceDimmer"] = dim;   dataObj["deviceCpuTempC"] =
  // TempCPUValue();
  dataObj["deviceADCValue"] = adcValue;
  // dataObj["deviceRestarts"] = device_restart;
  // dataObj["wifiRssiStatus"] = WiFi.RSSI();
  // dataObj["wifiQuality"] = getRSSIasQuality(WiFi.RSSI());
  // dataObj["wifiIPv4"] = ipStr(WiFi.localIP());
  // jsonDoc["jsonVersion"] = "1.0.0";
  serializeJson(jsonDoc, response);
  return response;
}

// -------------------------------------------------------------------
// MQTT Loop Principal
// -------------------------------------------------------------------
void mqttloop() {
  if (mqtt_cloud_enable) {
    if (!mqttClient.connected()) {
      long now = millis();
      if ((now < 60000) || ((now - lastMqttReconnectAttempt) > 120000)) {
        lastMqttReconnectAttempt = now;
        if (mqtt_connect()) {
          lastMqttReconnectAttempt = 0;
        }
        // setOnSingle(MQTTLED);
      }
    } else {
      mqttClient.loop();
      // setOffSingle(MQTTLED);
    }
  }
}
