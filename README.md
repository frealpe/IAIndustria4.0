# IAIndustria4.0 - Sistema Seguro de IoT e IA

Este proyecto es un sistema completo de monitoreo y control industrial que integra **Inteligencia Artificial** para el análisis de datos en tiempo real y **comunicaciones seguras End-to-End (TLS/SSL)**. Diseñado como proyecto de grado, demuestra la aplicación de tecnologías de Industria 4.0.

## 🚀 Inicio Rápido

Para una comprensión profunda de la arquitectura del sistema, consulta:
👉 **[ARCHITECTURE.md](./ARCHITECTURE.md)**

## 📂 Estructura del Proyecto

El repositorio está organizado en los siguientes componentes principales:

*   **`Servidor/`**: Backend desarrollado en Node.js. Maneja la lógica de negocio, la comunicación MQTT, la base de datos y los agentes de IA.
*   **`Plc/`**: Frontend moderno construido con React. Proporciona un dashboard interactivo para la visualización de datos y el control de dispositivos.
*   **`Esp32/`**: Firmware para los dispositivos IoT (ESP32). Implementa la lectura de sensores y la comunicación segura MQTT.
*   **`Documentacion/`**: Archivos de la tesis, diagramas y documentación técnica adicional.

## 🛠️ Requisitos Previos

*   **Node.js**: v18 o superior.
*   **npm** o **yarn**: Gestor de paquetes.
*   **PlatformIO** o **Arduino IDE**: Para compilar y subir el firmware al ESP32.
*   **Broker MQTT**: (Opcional si usas uno externo) Mosquitto o similar con soporte TLS.

## ⚙️ Instalación y Configuración

### 1. Servidor (Backend)

```bash
cd Servidor
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Edita el archivo .env con tus credenciales de base de datos y MQTT

# Iniciar el servidor
npm start
```

### 2. Dashboard (Frontend)

```bash
cd Plc
# Instalar dependencias
npm install 

# Iniciar en modo desarrollo
npm run dev
```

### 3. Firmware (ESP32)

1.  Abre el directorio `Esp32/` en PlatformIO (recomendado) o Arduino IDE.
2.  Configura las credenciales Wi-Fi y MQTT en `src/main.cpp` o el archivo de configuración correspondiente.
3.  Carga los certificados SSL necesarios si el modo seguro está habilitado.
4.  Compila y sube el firmware a tu dispositivo ESP32.

## ✨ Características Principales

*   **Monitoreo en Tiempo Real**: Visualización de datos de sensores con baja latencia.
*   **Detección de Anomalías con IA**: Agentes inteligentes analizan los datos para detectar comportamientos inusuales.
*   **Seguridad Robusta**: Comunicación cifrada (MQTTS/HTTPS) entre todos los componentes.
*   **Arquitectura Escalable**: Diseño modular que permite añadir más dispositivos y servicios fácilmente.

## 👥 Autores

Proyecto desarrollado para la titulación en Ingeniería.

---
© 2026 - IAIndustria4.0
