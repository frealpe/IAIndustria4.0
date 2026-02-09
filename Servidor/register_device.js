/**
 * Helper script to register the existing ESP32 device
 * Run with: node register_device.js
 */
const DeviceModel = require('./models/DeviceModel');

async function registerDevice() {
    try {
        // Register the ESP32 device that's currently online
        const device = await DeviceModel.create(
            'ESP32DDEF49C0F4A8',
            'DD:EF:49:C0:F4:A8',  // MAC address extracted from UID
            'ESP32 Principal',
            'Dispositivo ESP32 para monitoreo industrial'
        );
        
        console.log('✅ Dispositivo registrado exitosamente:', device);
        process.exit(0);
    } catch (error) {
        if (error.code === '23505') {
            console.log('ℹ️ El dispositivo ya existe en la base de datos');
        } else {
            console.error('❌ Error:', error.message);
        }
        process.exit(1);
    }
}

registerDevice();
