import React, { useState, useRef, useEffect } from "react";
import {
    CBadge,
    CCard,
    CCardHeader,
} from "@coreui/react-pro";
import GptMessage from "../tarjeta/GptMessage";
import MyMessage from "../tarjeta/MyMessage";
import TypingLoader from "../loaders/TypingLoader";
import TextMessageBox from "../tarjeta/TextMessageBox";
import { useInteligenciaStore } from "../../hook/inteligencia/useInteligencia";

const AsistenteBlock = ({ onNewData, selectedRows, selectedTable }) => {
    const { envioMensajeIA } = useInteligenciaStore();
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const handlePost = async (mensaje) => {
        if (!mensaje?.text?.trim() && !mensaje?.file) return;

        const mensajeNormalizado = {
            text: mensaje.text?.trim() || "",
            file: mensaje.file || null,
            selectedTests: selectedRows, // Add selected tests context
            selectedTable: selectedTable // Add table context
        };

        setMessages((prev) => [...prev, { text: mensajeNormalizado.text, isGpt: false }]);

        try {
            setIsLoading(true);
            const respuesta = await envioMensajeIA({ mensaje: mensajeNormalizado });
            const { conversacion, resultado } = respuesta;

            setMessages((prev) => [
                ...prev,
                {
                    text: conversacion || "Respuesta vacía...",
                    isGpt: true,
                    data: resultado || null
                }
            ]);

            if (resultado && Array.isArray(resultado) && resultado.length > 0) {
                // Enviar datos al padre si es necesario para graficar
                let dataToGraph = resultado;
                if (resultado[0].resultado && Array.isArray(resultado[0].resultado)) {
                    dataToGraph = resultado[0].resultado;
                }

                if (onNewData) {
                    onNewData(dataToGraph);
                }
            }

        } catch (error) {
            console.error("❌ Error al procesar mensaje en Asistente:", error);
            setMessages((prev) => [
                ...prev,
                { text: `Error: ${error.message || 'Error desconocido'}`, isGpt: true },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    return (
        <CCard className="h-100 shadow-sm d-flex flex-column">
            <CCardHeader className="bg-light d-flex justify-content-between align-items-center py-2">
                <strong>🤖 Asistente de Control</strong>
                <CBadge color="primary">GPT-4o</CBadge>
            </CCardHeader>
            <div
                className="flex-grow-1 p-3 bg-light bg-opacity-10 d-flex flex-column"
                style={{ overflowY: 'auto' }}
            >
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <GptMessage text="Soy tu Agente de Control experto. ¿En qué puedo ayudarte hoy?" />
                    {messages.map((m, i) => (
                        m.isGpt ? (
                            <div key={i}>
                                <GptMessage text={m.text} data={m.data} />
                            </div>
                        ) : (
                            <MyMessage key={i} text={m.text} />
                        )
                    ))}
                    {isLoading && (
                        <div className="fade-in mt-2">
                            <TypingLoader />
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Caja de Texto fija abajo */}
            <div className="p-3 bg-white border-top">
                <TextMessageBox
                    onSendMessage={handlePost}
                    placeholder="Escribe un comando o consulta..."
                    disableCorrections
                />
            </div>
        </CCard>
    );
};

export default AsistenteBlock;
