// -------------------------------------------------------------------
// Declaración de funciones
// -------------------------------------------------------------------
void TaskWifiReconnect(void *pvParamenters);
void wifiLoop();

// -------------------------------------------------------------------
// Tarea Loop WIFI & Reconectar modo Cliente
// -------------------------------------------------------------------
void TaskWifiReconnect(void *pvParamenters) {
  (void)pvParamenters;

  while (1) {
    vTaskDelay(10 / portTICK_PERIOD_MS);
    wifiLoop();
  }
}

// -------------------------------------------------------------------
// Tarea Loop MQTT & Reconectar
// -------------------------------------------------------------------
void TaskMqttReconnect(void *pvParamenters) {
  (void)pvParamenters;
  while (1) {
    if ((WiFi.status() == WL_CONNECTED)) {
      if (mqtt_server != 0) {
        // llamar la función del loop mqtt
        mqttloop();
        // Enviar por MQTT el JSON
        if (mqttClient.connected()) {
          if (millis() - lasMsg > mqtt_time_interval) { // 60 s
            lasMsg = millis();
            mqtt_publish();
            log("INFO: Mansaje enviado por MQTT...");
          }
        }
      }
    }
  }
}

// -------------------------------------------------------------------
// Tarea MQTT LED pestañeo
// -------------------------------------------------------------------
void TaskMQTTLed(void *pvParameters) {
  (void)pvParameters;
  while (1) {
    vTaskDelay(10 / portTICK_PERIOD_MS);

    if (mqttClient.connected()) {
      digitalWrite(MQTTLED, HIGH);
      vTaskDelay(50 / portTICK_PERIOD_MS);
      digitalWrite(MQTTLED, LOW);
      vTaskDelay(1000 / portTICK_PERIOD_MS);
    } else {
      digitalWrite(MQTTLED, LOW);
    }
  }
}
