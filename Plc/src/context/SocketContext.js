import React, { createContext } from 'react';
import { useSocket } from '../hook/socket/useSocket';
import { getEnvVariables } from '../helpers/getEnvVariables';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    // Usar la URL de la API pero removiendo el /api/ al final para la conexión de socket
    const { VITE_API_URL } = getEnvVariables();
    const serverPath = (VITE_API_URL || 'http://localhost:8080/api/').replace('/api/', '');
    const { socket, online } = useSocket(serverPath);

    return (
        <SocketContext.Provider value={{ socket, online }}>
            { children }
        </SocketContext.Provider>
    )
}

