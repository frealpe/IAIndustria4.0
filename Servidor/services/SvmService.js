const dfd = require("danfojs-node");
const tf = dfd.tensorflow;
const path = require('path');
const fs = require('fs');
const Esp32Model = require('../models/Esp32Model');
const TrainedModelModel = require('../models/TrainedModelModel');
const DeviceModel = require('../models/DeviceModel');
const socketService = require('../services/SocketService');

const MAX_ADC_VALUE = 4095;
const ANOMALY_THRESHOLD = 0.05;       // Umbral de error (MSE) para detectar anomalía

// Dynamic training parameters (can be overridden by manual training)
let MAX_SAMPLES = 10;
let TRAINING_BATCHES_REQUIRED = 10

let sampleBuffer = [];
let rawBuffer = [];
let trainingData = [];
let model = null;
let isTraining = false;
let isModelReady = false;
let currentDeviceUid = null;
let trainingHistory = [];
let isManualTraining = false;  // Flag to distinguish manual vs automatic training

// Directory for saving models
const MODELS_DIR = path.join(__dirname, '..', 'trained_models');

// Initialize table and try to load existing model
(async () => {
    try {
        console.log("🔍 [AI] Diagnostics: Checking DB Connection...");
        const pool = await require('../database/config').dbConnection();
        const res = await pool.query('SELECT NOW()');
        console.log("✅ [AI] DB Connection OK:", res.rows[0].now);

        await TrainedModelModel.initTable();
        await DeviceModel.init();
        console.log("💾 [AI] Model persistence system initialized");

        // Hardcode check for user device
        const testDev = 'ESP32DDEF49C0F4A8';
        const active = await TrainedModelModel.getActiveModel(testDev);
        console.log(`🔍 [AI] Active model for ${testDev}:`, active ? `FOUND (${active.model_path})` : "NOT FOUND");

    } catch (error) {
        console.error("❌ Error initializing model persistence:", error);
    }
})();

// Construir el Autoencoder
function buildModel() {
    const model = tf.sequential();
    // Encoder
    model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [MAX_SAMPLES] }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    // Decoder
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: MAX_SAMPLES, activation: 'linear' })); // Reconstrucción

    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
    return model;
}

/**
 * Entrena el modelo con los datos recolectados.
 */
async function trainModel() {
    if (isTraining) return;
    isTraining = true;
    trainingHistory = []; // Reset training history
    
    console.log("🚀 [AI] EJECUTANDO trainModel()...");
    console.log("🚀 [AI] Iniciando entrenamiento del Autoencoder...");

    // Convertir datos a tensores
    const tensorData = tf.tensor2d(trainingData, [trainingData.length, MAX_SAMPLES]);

    // Emit training start event
    socketService.emit('training:started', {
        device_uid: currentDeviceUid,
        total_epochs: 50,
        batches: trainingData.length
    });

    // Entrenar con callback para capturar loss
    await model.fit(tensorData, tensorData, {
        epochs: 50,
        batchSize: 4,
        shuffle: true,
        verbose: 0,
        callbacks: {
            onEpochEnd: async (epoch, logs) => {
                trainingHistory.push({
                    epoch: epoch + 1,
                    loss: logs.loss
                });
                
                // Emit real-time progress via WebSocket
                console.log(`📤 [AI] Emitiendo training:progress para época ${epoch + 1}`);
                socketService.emit('training:progress', {
                    device_uid: currentDeviceUid,
                    epoch: epoch + 1,
                    total_epochs: 50,
                    loss: logs.loss,
                    history: trainingHistory
                });
                
                if ((epoch + 1) % 10 === 0) {
                    console.log(`📈 [AI] Época ${epoch + 1}/50 - Loss: ${logs.loss.toFixed(6)}`);
                }

                // Add artificial delay to allow visualization on frontend
                await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay per epoch
            }
        }
    });

    const finalLoss = trainingHistory[trainingHistory.length - 1].loss;
    console.log(`✅ [AI] Modelo entrenado. Loss final: ${finalLoss.toFixed(6)}`);
    
    // Emit training completed event
    socketService.emit('training:completed', {
        device_uid: currentDeviceUid,
        final_loss: finalLoss,
        history: trainingHistory
    });
    
    isModelReady = true;
    isTraining = false;
    
    // Save model to disk
    await saveModel();
    
    // Liberar memoria de tensores de entrenamiento
    tensorData.dispose();
}

/**
 * Saves the trained model to disk and registers it in the database
 */
async function saveModel() {
    console.log("💾 [AI DEBUG] saveModel() called");
    
    if (!model) {
        console.warn("⚠️ [AI DEBUG] Cannot save model: model is null");
        return;
    }
    if (!currentDeviceUid) {
        console.warn("⚠️ [AI DEBUG] Cannot save model: currentDeviceUid is missing");
        return;
    }

    try {
        const timestamp = Date.now();
        const modelName = `autoencoder_${currentDeviceUid}_${timestamp}`;
        const modelPath = path.join(MODELS_DIR, modelName);
        const fileUrl = `file://${modelPath}`;

        console.log(`📂 [AI DEBUG] Target model path: ${modelPath}`);

        // Ensure directory exists
        if (!fs.existsSync(MODELS_DIR)) {
            console.log("📂 [AI DEBUG] Creating models directory...");
            fs.mkdirSync(MODELS_DIR, { recursive: true });
        }

        // Deactivate all existing models for this device BEFORE saving new one
        console.log(`🔄 [AI] Desactivando modelos antiguos para ${currentDeviceUid}...`);
        if (fs.existsSync(MODELS_DIR)) {
            const folders = fs.readdirSync(MODELS_DIR);
            for (const folder of folders) {
                const metadataPath = path.join(MODELS_DIR, folder, 'metadata.json');
                
                if (fs.existsSync(metadataPath)) {
                    try {
                        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                        
                        if (metadata.device_uid === currentDeviceUid && metadata.is_active) {
                            metadata.is_active = false;
                            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
                            console.log(`  ⚪ Desactivado: ${folder}`);
                        }
                    } catch (e) {
                        console.warn(`⚠️ Error reading metadata for ${folder}:`, e.message);
                    }
                }
            }
        }

        // Save TensorFlow model
        console.log("💾 [AI DEBUG] Saving TF model to disk...");
        await model.save(fileUrl);
        console.log(`✅ [AI] Modelo guardado en: ${modelPath}`);

        // Calculate final loss
        const finalLoss = trainingHistory.length > 0 
            ? trainingHistory[trainingHistory.length - 1].loss 
            : 0; // Default to 0 if NaN or undefined

        // Save metadata as JSON file with is_active: true
        const metadata = {
            device_uid: currentDeviceUid,
            trained_at: new Date().toISOString(),
            samples_count: trainingData.length * MAX_SAMPLES,
            batches_count: trainingData.length,
            threshold: ANOMALY_THRESHOLD,
            training_history: trainingHistory,
            final_loss: finalLoss,
            is_active: true  // New model is active by default
        };

        const metadataPath = path.join(modelPath, 'metadata.json');
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        console.log(`✅ [AI] Nuevo modelo activo guardado con ${trainingHistory.length} épocas`);

        // --- Save to Database ---
        console.log("� [AI→DB] Iniciando persistencia en base de datos...");
        
        try {
            const samplesCount = trainingData.length * MAX_SAMPLES;
            const batchesCount = trainingData.length;
            
            console.log(`📝 [AI→DB] Parámetros del modelo:
                ├─ Device UID: ${currentDeviceUid}
                ├─ Model Path: ${modelPath}
                ├─ Samples Count: ${samplesCount}
                ├─ Batches Count: ${batchesCount}
                ├─ Threshold: ${ANOMALY_THRESHOLD}
                ├─ Final Loss: ${finalLoss}
                └─ Training History: ${trainingHistory.length} épocas
            `);

            const result = await TrainedModelModel.create(
                currentDeviceUid,
                modelPath, // Absolute path to model directory
                samplesCount,
                batchesCount,
                ANOMALY_THRESHOLD,
                trainingHistory, // Pass array directly, PostgreSQL handles JSONB
                finalLoss
            );
            
            if (result && result.id) {
                console.log(`✅ [AI→DB] ¡Modelo registrado exitosamente!`);
                console.log(`✅ [AI→DB] ID: ${result.id} | is_active: ${result.is_active}`);
            } else {
                console.warn("⚠️ [AI→DB] Modelo guardado pero sin confirmación de ID");
            }
        } catch (dbError) {
            console.error("❌ [AI→DB] CRITICAL ERROR: No se pudo guardar en base de datos");
            console.error("❌ [AI→DB] Error:", dbError.message);
            console.error("❌ [AI→DB] Stack:", dbError.stack);
            console.error("❌ [AI→DB] Esto significa que el modelo NO se cargará automáticamente");
        }

    } catch (error) {
        console.error("❌ Error guardando modelo (general):", error);
        console.error(error.stack);
    }
}

/**
 * Loads the active model for a device from disk (filesystem-based)
 */
async function loadModel(deviceUid) {
    try {
        // Query Database for active model
        const activeModelRecord = await TrainedModelModel.getActiveModel(deviceUid);

        if (!activeModelRecord) {
            console.log(`📭 [AI] loadModel: No active model record in DB for ${deviceUid}`);
            return false;
        }

        const activeModelPath = activeModelRecord.model_path;

        if (!activeModelPath) {
            console.log(`📭 [AI] loadModel: Record found but model_path is empty for ${deviceUid}`);
            return false;
        }

        const modelJsonPath = path.join(activeModelPath, 'model.json');

        // Check if model files exist
        if (!fs.existsSync(modelJsonPath)) {
            console.warn(`⚠️ [AI] loadModel: DB says active, but FILE MISSING at ${modelJsonPath}`);
             // Optional: Deactivate in DB if file missing?
            return false;
        }

        // Load model
        const loadedModel = await tf.loadLayersModel(`file://${modelJsonPath}`);
        
        // SHAPE VALIDATION: Verify the model's input shape matches current MAX_SAMPLES
        const inputShape = loadedModel.inputs[0].shape;
        const expectedInputSize = MAX_SAMPLES;
        const modelInputSize = inputShape[1]; // Get the second dimension [null, MAX_SAMPLES]
        
        if (modelInputSize !== expectedInputSize) {
            console.warn(`⚠️ [AI] SHAPE MISMATCH DETECTED!`);
            console.warn(`   ├─ Modelo esperado: [null, ${modelInputSize}]`);
            console.warn(`   ├─ Configuración actual: [null, ${expectedInputSize}]`);
            console.warn(`   └─ El modelo será descartado. Se requiere reentrenamiento.`);
            
            // Dispose the incompatible model
            loadedModel.dispose();
            
            // Mark model as NOT ready to trigger retraining
            isModelReady = false;
            
            return false;
        }
        
        // Shape is compatible - proceed
        model = loadedModel;
        model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
        
        currentDeviceUid = deviceUid;
        isModelReady = true;
        
        // CRITICAL: Ensure we reset training data if we successfully loaded a model
        // This prevents the system from thinking it still needs to collect data
        trainingData = []; 
        isTraining = false;
        
        console.log(`✅ [AI] Modelo activo cargado exitosamente desde ${activeModelPath}`);
        console.log(`✅ [AI] Input shape verificado: [null, ${modelInputSize}] ✓`);
        
        return true;
    } catch (error) {
        console.error("❌ Error cargando modelo:", error);
        return false;
    }
}

/**
 * Detecta anomalías calculando el error de reconstrucción (MSE).
 */
function detectAnomaly(dataBatch) {
    if (!isModelReady) return null;

    return tf.tidy(() => {
        const inputTensor = tf.tensor2d([dataBatch], [1, MAX_SAMPLES]);
        const reconstruction = model.predict(inputTensor);
        const mse = tf.losses.meanSquaredError(inputTensor, reconstruction).dataSync()[0];
        
        const isAnomaly = mse > ANOMALY_THRESHOLD;
        
        // Formatear resultado
        return {
            isAnomaly: isAnomaly,
            loss: mse.toFixed(6),
            threshold: ANOMALY_THRESHOLD
        };
    });
}

/**
 * Agrega un valor ADC, lo normaliza, gestiona el buffer y coordina IA.
 */
async function addSample(rawValue, deviceUid) {
    // 0. Protección de datos
    const safeRawValue = rawValue || 0;

    // 0.0. Protection during Manual Training
    if (isManualTraining && currentDeviceUid && deviceUid !== currentDeviceUid) {
        console.warn(`⚠️ [AI] Ignorando datos de ${deviceUid} porque estamos en entrenamiento manual para ${currentDeviceUid}`);
        return; 
    }

    // 0.1. Track device and attempt to load existing model
    if (deviceUid && currentDeviceUid !== deviceUid) {
        console.log(`🔄 [AI] Cambiando a dispositivo: ${deviceUid}`);
        currentDeviceUid = deviceUid;
        
        // Try to load existing model for this device
        if (!isModelReady && !isTraining) {
            const loaded = await loadModel(deviceUid);
            if (loaded) {
                console.log(`✅ [AI] Modelo existente cargado para ${deviceUid}`);
            }
        }
    }

    // 1. Validar y Normalizar
    let clampedValue = safeRawValue;
    if (clampedValue < 0) clampedValue = 0;
    if (clampedValue > MAX_ADC_VALUE) clampedValue = MAX_ADC_VALUE;
    
    // Normalizar para IA (0.0 - 1.0)
    const normalizedValue = parseFloat((clampedValue / MAX_ADC_VALUE).toFixed(4));

    // 2. Buffers
    sampleBuffer.push(normalizedValue);
    rawBuffer.push(safeRawValue); // Guardamos el valor real

    // 3. Procesar lote lleno
    if (sampleBuffer.length >= MAX_SAMPLES) {
        // Copias de los buffers actuales
        const fullWindow = [...sampleBuffer];
        const fullRawWindow = [...rawBuffer];
        
        // Limpiar buffers
        sampleBuffer = [];
        rawBuffer = [];

        // Debug log for state tracking
        if (sampleBuffer.length === 0) { // Only log once per batch
             console.log(`🧐 [AI State] Device: ${deviceUid}, Ready: ${isModelReady}, Training: ${isTraining}, Collecting: ${trainingData.length}/${TRAINING_BATCHES_REQUIRED}`);
        }

        // --- LÓGICA IA ---
        
        if (!model) model = buildModel();

        if (!isModelReady && !isTraining) {
            // Fase de Recolección para Entrenamiento
            trainingData.push(fullWindow);
             console.log(`📊 [AI] Recolectando: ${trainingData.length}/${TRAINING_BATCHES_REQUIRED}`);

            // GUARDAR HISTÓRICO "MEJOR OPCIÓN": Datos Crudos + Contexto
            let savedRecord = null;
            if (deviceUid) {
               // Calculate Mean
               const sum = fullRawWindow.reduce((a, b) => a + b, 0);
               const avg = (sum / fullRawWindow.length) || 0;

               const resultadoParaBD = {
                   phase: "collecting", // Fase del sistema
                   count: trainingData.length,
                   dataSnapshot: fullWindow, // Datos IA (Normalizados)
                   rawValues: fullRawWindow,  // Datos Reales (0-4095) <--- IMPORTANTE
                   timestamp: Date.now()
               };
               savedRecord = await Esp32Model.create(deviceUid, resultadoParaBD, avg);
            }

            if (trainingData.length >= TRAINING_BATCHES_REQUIRED) {
                // Only check for existing model if this is NOT manual training
                if (!isManualTraining) {
                    const existingModel = await loadModel(currentDeviceUid);
                    
                    if (existingModel) {
                        console.log(`✅ [AI] Modelo existente encontrado para ${currentDeviceUid}. Cancelando entrenamiento automático.`);
                        // Clear training data and mark model as ready
                        trainingData = [];
                        isModelReady = true;
                        return { status: "ready", message: "Modelo existente cargado" };
                    }
                }
                
                // No existing model OR manual training - proceed
                console.log(`📚 [AI] ${isManualTraining ? '🔧 Entrenamiento MANUAL forzado' : 'No se encontró modelo existente. Iniciando entrenamiento...'}`);
                trainModel();
            }
            // Emitir evento socket
            if (savedRecord) {
                socketService.emit('mqtt:data:update', savedRecord);
            }
            // Retornar savedRecord para emitir por socket
            return { status: "collecting", count: trainingData.length, savedRecord };
        } 
        
        if (isModelReady) {
            // Fase de Inferencia (Detección)
            const result = detectAnomaly(fullWindow);
            
            const logMsg = result.isAnomaly 
                ? `🚨 [ANOMALIA] Loss: ${result.loss}` 
                : `💚 [Normal] Loss: ${result.loss}`;
            console.log(logMsg);

            // GUARDAR HISTÓRICO "MEJOR OPCIÓN"
            let savedRecord = null;
            if (deviceUid) {
               const sum = fullRawWindow.reduce((a, b) => a + b, 0);
               const avg = (sum / fullRawWindow.length) || 0;

               const resultadoParaBD = {
                   phase: "inference",
                   loss: result.loss,
                   threshold: result.threshold,
                   isAnomaly: result.isAnomaly,
                   dataSnapshot: fullWindow, // Datos IA
                   rawValues: fullRawWindow,  // Datos Reales (0-4095) <--- IMPORTANTE
                   timestamp: Date.now()
               };
               savedRecord = await Esp32Model.create(deviceUid, resultadoParaBD, avg);
               if (savedRecord) {
                   socketService.emit('mqtt:data:update', savedRecord);
               }
            }

            return { status: "inference", result: result, data: fullWindow, savedRecord };
        }
    }

    return null;
}

/**
 * Start manual training with custom parameters
 * @param {string} deviceUid - Device UID to train for
 * @param {number} maxSamples - Number of samples per batch
 * @param {number} batchesRequired - Number of batches to collect
 */
async function startManualTraining(deviceUid, maxSamples, batchesRequired) {
    try {
        // Reset training state
        trainingData = [];
        sampleBuffer = [];
        rawBuffer = [];
        currentDeviceUid = deviceUid;
        isModelReady = false;
        isTraining = false;
        trainingHistory = [];
        isManualTraining = true;  // CRITICAL: Set manual training flag

        // Apply custom training parameters
        MAX_SAMPLES = parseInt(maxSamples);
        TRAINING_BATCHES_REQUIRED = parseInt(batchesRequired);

        console.log(`🚀 [AI] Entrenamiento MANUAL iniciado para ${deviceUid}`);
        console.log(`📊 [AI] Parámetros aplicados: ${MAX_SAMPLES} muestras × ${TRAINING_BATCHES_REQUIRED} lotes = ${MAX_SAMPLES * TRAINING_BATCHES_REQUIRED} datos totales`);

        // Force model rebuild to match new input shape
        if (model) {
             console.log("♻️ [AI] Desechando modelo anterior para ajustar input shape...");
             model.dispose();
             model = null;
        }
        
        // Rebuild model with current MAX_SAMPLES
        model = buildModel();

        console.log(`🏁 [AI] startManualTraining ejecutado. Esperando ${TRAINING_BATCHES_REQUIRED} lotes.`);

        return {
            ok: true,
            device_uid: deviceUid,
            max_samples: MAX_SAMPLES,
            batches_required: TRAINING_BATCHES_REQUIRED,
            total_samples: MAX_SAMPLES * TRAINING_BATCHES_REQUIRED,
            message: 'El sistema está listo para iniciar el entrenamiento. Envía datos desde el ESP32.'
        };
    } catch (error) {
        console.error('❌ Error en startManualTraining:', error);
        throw error;
    }
}

module.exports = {
    addSample,
    startManualTraining
};
