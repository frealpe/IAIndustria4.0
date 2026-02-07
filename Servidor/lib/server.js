const express = require('express');
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

        this.middlewares();
        this.conectarDB();
        this.conectarMqtt();
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
