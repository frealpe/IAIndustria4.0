/**
 * Central Database Schema definition.
 * Used by McpService and MultiAgentService to ensure consistency.
 */
const DB_SCHEMA = `
=============================
GENERAL DATABASE SCHEMA
=============================

--- TABLE: devices ---
Contains information about registered IoT devices.
Columns:
- id: SERIAL PRIMARY KEY
- device_uid: VARCHAR(50) UNIQUE -> Logical identifier (e.g., ESP32_123)
- mac_address: VARCHAR(17) UNIQUE -> Device MAC
- name: VARCHAR(100) -> Descriptive name (e.g. 'Planta1'). JOIN with 'datos' using device_uid to filter by name.
- description: TEXT
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

--- TABLE: datos ---
Contains inference results and sensor data from IoT devices.
Columns:
- id: SERIAL PRIMARY KEY
- device_uid: TEXT -> FK to devices.device_uid
- device_id: INTEGER -> FK to devices.id
- resultado: JSONB -> Main data payload
- mean: NUMERIC -> Signal average
- created_at: TIMESTAMPTZ

--- ESTRUCTURA DEL JSONB 'resultado' ---
{
  "loss": number,          // Error value
  "phase": string,         // 'training' | 'inference'
  "isAnomaly": boolean,    // True if anomaly detected
  "threshold": number,     // Detection threshold
  "timestamp": number,     // Event time (ms)
  "rawValues": number[],   // Raw ADC signal
  "dataSnapshot": number[] // Normalized signal
}

--- TABLE: modelo_entrenado ---
Contains IA models trained for each device.
Columns:
- id: SERIAL PRIMARY KEY
- device_uid: VARCHAR(50) -> FK to devices
- model_path: TEXT -> File path
- accuracy: NUMERIC
- epochs: INTEGER
- loss: NUMERIC
- is_active: BOOLEAN
- trained_at: TIMESTAMP

=============================
POSTGRESQL JSONB TIPS
=============================
- resultado->>'campo' (returns text)
- (resultado->>'loss')::float (cast to number)
- (resultado->>'isAnomaly')::boolean (cast to bool)
`;

module.exports = { DB_SCHEMA };
