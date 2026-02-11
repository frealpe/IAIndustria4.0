const express = require('express');
const DatosModel = require("../models/DatosModel");
const ModeloEntrenado = require("../models/ModeloEntrenado");
const cors = require('cors');
const http = require('http'); // Importar HTTP
const socketIo = require('socket.io'); // Importar Socket.io
const { dbConnection } = require('../database/config');
const socketService = require('../services/SocketService'); // Importar SocketService
const mqttService = require('../mqtt/conectMqtt'); // Importar MQTT

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;

        // Crear servidor HTTP sobre Express
        this.server = http.createServer(this.app);
        
        // Inicializar Socket.io sobre el servidor HTTP
        this.io = socketIo(this.server, {
            cors: {
                origin: "*", // Permitir conexiones desde cualquier origen (ajustar en producción)
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
            console.log('Servidor corriendo en puerto', this.port);
        });
    }
}

module.exports = Server;
