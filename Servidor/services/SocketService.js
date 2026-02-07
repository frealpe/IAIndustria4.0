class SocketService {
    constructor() {
        if (SocketService.instance) {
            return SocketService.instance;
        }

        this.io = null;
        SocketService.instance = this;
    }

    // Inicializar con la instancia de IO desde el servidor HTTP
    initialize(io) {
        this.io = io;
        
        this.io.on('connection', (socket) => {
            console.log('🔌 Nuevo cliente conectado:', socket.id);

            socket.on('disconnect', () => {
                console.log('❌ Cliente desconectado:', socket.id);
            });
        });

        console.log('✅ SocketService inicializado');
    }

    // Método para emitir eventos a todos los clientes
    emit(event, data) {
        if (!this.io) {
            console.warn('⚠️ Intentando emitir evento sin inicializar SocketService');
            return;
        }
        console.log(`📡 Emitiendo evento [${event}]`);
        this.io.emit(event, data);
    }
}

module.exports = new SocketService();
