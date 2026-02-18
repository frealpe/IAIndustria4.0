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
            const { conversacion, resultado, visualization } = respuesta;

            // Merge resultado and visualization into a single data object for GptMessage
            console.log("🔍 [AsistenteBlock] Backend response:", respuesta);
            console.log("🔍 [AsistenteBlock] Visualization extracted:", visualization);
            const messageData = { ...(resultado || {}), visualization };
            console.log("🔍 [AsistenteBlock] Message data merged:", messageData);

            setMessages((prev) => [
                ...prev,
                {
                    text: conversacion || "Respuesta vacía...",
                    isGpt: true,
                    data: messageData
                }
            ]);

            // Verify if result is valid (Array for charts OR Object for reports)
            if (resultado && (Array.isArray(resultado) || typeof resultado === 'object')) {
                console.log("🔍 [AsistenteBlock] Resultado received:", resultado);
                // Extract data for graph if exists
                let dataToGraph = null;
                if (Array.isArray(resultado)) {
                    dataToGraph = resultado;
                } else if (resultado.data) {
                    // If  resultado has 'data' field, extract it
                    dataToGraph = resultado.data;
                }

                // If resultado has structure like { resumen, metrias, charts, conclusion }, extract it
                let analysisObj = null;
                if (resultado.resumen || resultado.charts || resultado.metrias) {
                    analysisObj = resultado;
                    console.log("📊 [AsistenteBlock] Analysis object detected:", analysisObj);
                    console.log("📊 [AsistenteBlock] Charts:", analysisObj.charts?.length || 0);
                }

                // Send both to parent
                if (onNewData) {
                    console.log("📤 [AsistenteBlock] Sending to parent:", { dataToGraph, analysisObj });
                    onNewData(dataToGraph, analysisObj);
                }
            } else {
                console.warn("⚠️ [AsistenteBlock] Resultado is invalid:", resultado);
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

            </CCardHeader>
            <div
                className="flex-grow-1 p-3 bg-light bg-opacity-10 d-flex flex-column"
                style={{ overflowY: 'auto' }}
            >
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <GptMessage text="Soy tu Asistente de Análisis experto. ¿En qué puedo ayudarte hoy?" />
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
