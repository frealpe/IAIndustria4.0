import React, { createContext } from 'react';
import { useSocket } from '../hook/socket/useSocket';

export const SocketContext = createContext();


export const SocketProvider = ({ children }) => {
    // Usar la URL de la API pero removiendo el /api/ al final para la conexión de socket
    const serverPath = (process.env.VITE_API_URL || 'http://localhost:8080/api/').replace('/api/', '');
    const { socket, online } = useSocket(serverPath);

    return (
        <SocketContext.Provider value={{ socket, online }}>
            { children }
        </SocketContext.Provider>
    )
}

