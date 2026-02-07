# Documentación General del Sistema de Automatización

Este documento ofrece una visión global del proyecto, describiendo la arquitectura, los componentes y cómo ejecutar el sistema completo.

## 🏗 Arquitectura del Sistema

El sistema está dividido en tres componentes principales que interactúan entre sí:

### 1. Frontend: Interfaz de Usuario (`Plc`)
*   **Tecnología**: React (Vite + CoreUI).
*   **Función**: Proporciona la interfaz gráfica para que los operadores visualicen el estado de la planta, controlen actuadores y vean gráficos en tiempo real.
*   **Ubicación**: Carpeta `Plc/`.

### 2. Backend Principal (`ServidorPc`)
*   **Tecnología**: Node.js, Express, MongoDB, PostgreSQL.
*   **Función**: Es el cerebro del sistema. Gestiona la lógica de negocio, almacena datos históricos y de configuración, y coordina la comunicación entre el Frontend y el PLC.
*   **Comunicación**:
    *   Habla con el Frontend vía HTTP (REST API) y WebSocket (Socket.io).
    *   Habla con el PLC vía MQTT.
*   **Ubicación**: Carpeta `ServidorPc/`.

### 3. Backend PLC (`ServidorPlc`)
*   **Tecnología**: Node.js, C++ Addons, Industrial Shields Librpiplc.
*   **Hardware**: Raspberry Pi (Industrial Shields RPIPLC V6).
*   **Función**: Interactúa directamente con el hardware físico (sensores y actuadores) a través de los pines GPIO, ADC y PWM.
*   **Comunicación**: Recibe comandos y envía datos de sensores al `ServidorPc` mediante MQTT.
*   **Ubicación**: Carpeta `ServidorPlc/` (se ejecuta en la Raspberry Pi).

---

## 🚀 Guía de Inicio Rápido

Para poner en marcha todo el sistema, sigue estos pasos en orden:

### Paso 1: Infraestructura Base
Asegúrate de tener funcionando los servicios base:
1.  **Broker MQTT** (Mosquitto): Puerto 1883.
2.  **Bases de Datos**: MongoDB y PostgreSQL iniciados.

### Paso 2: Iniciar Servidor PC (Backend)
En la carpeta `ServidorPc`:

```bash
cd ServidorPc
npm install  # Solo la primera vez
npm start
```
*El servidor iniciará la conexión con las bases de datos y el broker MQTT.*

### Paso 3: Iniciar Servidor PLC (Hardware)
En la carpeta `ServidorPlc` (dentro de la Raspberry Pi):

```bash
cd ServidorPlc
npm install  # Solo la primera vez
npm start
```
*Este servidor comenzará a leer sensores y publicar datos en MQTT.*

### Paso 4: Iniciar Frontend (UI)
En la carpeta `Plc`:

```bash
cd Plc
npm install  # Solo la primera vez
npm start
```
*Abre el navegador en `http://localhost:5173` (o el puerto indicado) para acceder al sistema.*

---

## 📡 Flujo de Comunicación

1.  **Lectura**: `ServidorPlc` lee un sensor -> Publica en MQTT -> `ServidorPc` recibe el dato, lo guarda en BD y lo envía por WebSocket -> `Plc` (Frontend) actualiza la gráfica.
2.  **Control**: Usuario presiona un botón en `Plc` -> Envía comando a `ServidorPc` -> `ServidorPc` publica comando en MQTT -> `ServidorPlc` recibe comando -> Activa el relé físico.
