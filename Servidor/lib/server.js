const express = require('express');
const DatosModel = require("../models/DatosModel");
const ModeloEntrenado = require("../models/ModeloEntrenado");
const cors = require('cors');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const socketIo = require('socket.io'); 
const { dbConnection } = require('../database/config');
const socketService = require('../services/SocketService'); // Importar SocketService
const mqttService = require('../mqtt/conectMqtt'); // Importar MQTT

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 8080;
        // Configurar Servidor (HTTP o HTTPS)
        const sslEnabled = process.env.SSL_ENABLED === 'true';
        const keyPath = process.env.TLS_KEY_PATH || path.join(__dirname, '../certs/server.key');
        const certPath = process.env.TLS_CERT_PATH || path.join(__dirname, '../certs/server.crt');

        if (sslEnabled && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
            console.log('🔒 [Server] Iniciando en modo HTTPS...');
            const caPath = process.env.TLS_CA_PATH || path.join(__dirname, '../certs/ca.crt');
            const options = {
                key: fs.readFileSync(keyPath),
                cert: fs.readFileSync(certPath),
                ca: fs.existsSync(caPath) ? fs.readFileSync(caPath) : undefined
            };
            this.server = https.createServer(options, this.app);
            this.protocol = 'https';
        } else {
            if (sslEnabled) {
                console.warn('⚠️ [Server] SSL habilitado pero faltan certificados. Usando HTTP.');
            } else {
                console.log('🌐 [Server] Iniciando en modo HTTP...');
            }
            this.server = http.createServer(this.app);
            this.protocol = 'http';
        }
        
        // Inicializar Socket.io sobre el servidor
        this.io = socketIo(this.server, {
            cors: {
                origin: "*", 
                methods: ["GET", "POST"]
            }
        });

        // Inicializar Service de Sockets
        socketService.initialize(this.io);

        // Inicializar Modelos de Base de Datos
        // Note: The original instruction snippet had a syntax error here,
        // placing comments and code inside the `cors` object.
        // Corrected placement is after `this.io` initialization.
        // Assuming `this.aiService` is also initialized elsewhere or will be added.
        this.initModelsAndServices(); // Call a new method for clarity

        this.middlewares();
        this.conectarDB();
        this.conectarMqtt();
    }

    async initModelsAndServices() {
        await DatosModel.init();
        await ModeloEntrenado.init();
        
        // Inicializar persistencia de modelos IA
        // Assuming this.aiService is defined elsewhere or will be added.
        // For now, commenting out or ensuring it's handled if not present.
        // await this.aiService.initializePersistence(); 
    }

    conectarMqtt() {
        mqttService.connect();
    }

    async conectarDB() {
        await dbConnection();
    }

    middlewares() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
        

        // Chat Routes
        this.app.use('/api/chat', require('../routers/chat'));
        
        // Data Routes (Direct DB Access)
        this.app.use('/api/data', require('../routers/data'));
    }

    listen() {
        // IMPORTANTE: usar this.server.listen en lugar de this.app.listen
        this.server.listen(this.port, () => {
            console.log(`🚀 Servidor corriendo en ${this.protocol}://localhost:${this.port}`);
        });
    }
}

module.exports = Server;
