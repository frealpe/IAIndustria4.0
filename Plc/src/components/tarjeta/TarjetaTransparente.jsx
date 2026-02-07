import React, { useRef, useState } from "react";
import "./Tarjetainformacion.css"; // Opcional: estilos externos

const TarjetaTransparente = ({
    titulo,
    subtitulo,
    children,
}) => {
    const cardRef = useRef(null);
    const [pos, setPos] = useState({ x: 500, y: 400 });
    const [dragging, setDragging] = useState(false);
    const [minimizado, setMinimizado] = useState(false); // 👈 arranca ABIERTO
    const offsetRef = useRef({ x: 0, y: 0 });

    // 🔹 Posición inicial inteligente (Abajo-Derecha)
    // 🔹 Posición inicial inteligente y Responsividad
    React.useEffect(() => {
        const updatePosition = () => {
            const cardWidth = 520; // Aproximado del contenido
            const cardHeight = 315;

            setPos((prevPos) => {
                const maxX = window.innerWidth - cardWidth - 20;
                const maxY = window.innerHeight - cardHeight - 20;

                // Si la posición previa está fuera de los límites, ajustar
                // Si es la primera carga (x=500, y=400 default), intentar posicionar abajo-derecha
                let newX = prevPos.x;
                let newY = prevPos.y;

                if (prevPos.x > maxX) newX = Math.max(10, maxX);
                if (prevPos.y > maxY) newY = Math.max(10, maxY);

                // Forzar posición inicial si parece ser la default
                if (prevPos.x === 500 && prevPos.y === 400) {
                    newX = Math.max(10, maxX);
                    newY = Math.max(10, maxY);
                }

                return { x: newX, y: newY };
            });
        };

        // Ejecutar al inicio
        updatePosition();

        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, []);

    // 🔹 Arrastre
    const handleTitleMouseDown = (e) => {
        e.preventDefault();
        setDragging(true);
        offsetRef.current = {
            x: e.clientX - pos.x,
            y: e.clientY - pos.y,
        };
    };

    const handleGlobalMouseMove = (e) => {
        if (!dragging) return;
        setPos({
            x: e.clientX - offsetRef.current.x,
            y: e.clientY - offsetRef.current.y,
        });
    };

    const handleGlobalMouseUp = () => {
        setDragging(false);
    };

    React.useEffect(() => {
        if (dragging) {
            document.addEventListener("mousemove", handleGlobalMouseMove);
            document.addEventListener("mouseup", handleGlobalMouseUp);
        } else {
            document.removeEventListener("mousemove", handleGlobalMouseMove);
            document.removeEventListener("mouseup", handleGlobalMouseUp);
        }

        return () => {
            document.removeEventListener("mousemove", handleGlobalMouseMove);
            document.removeEventListener("mouseup", handleGlobalMouseUp);
        };
    }, [dragging]);

    return (
        <div
            ref={cardRef}
            className="transparent-card"
            style={{
                position: "fixed",
                top: `${pos.y}px`,
                left: `${pos.x}px`,
                zIndex: 1000,
                background: "rgba(255, 255, 255, 0.9)",
                border: "1px solid #ccc",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                display: "inline-block",
                maxWidth: "30vw",
                maxHeight: "50vh",
                overflow: "auto",
                fontFamily: "Arial, sans-serif",
            }}
        >
            {/* 🔹 Cabecera */}
            <div
                className="card-header"
                onMouseDown={handleTitleMouseDown}
                style={{
                    padding: "12px 16px",
                    backgroundColor: "#f5f5f5",
                    borderBottom: "1px solid #ddd",
                    cursor: "grab",
                    userSelect: "none",
                    fontWeight: "bold",
                    color: "#333",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                {titulo}
                {/* 🔹 Botón de minimizar */}
                <button
                    onClick={() => setMinimizado((prev) => !prev)}
                    style={{
                        background: "none",
                        border: "none",
                        fontSize: "16px",
                        cursor: "pointer",
                        color: "#666",
                        fontWeight: "bold",
                        padding: "0 4px",
                    }}
                    aria-label="Minimizar"
                >
                    {minimizado ? "▢" : "–"}
                </button>
            </div>

            {/* 🔹 Subtítulo */}
            {!minimizado && subtitulo && (
                <div
                    style={{
                        padding: "8px 16px",
                        fontSize: "0.9em",
                        color: "#666",
                        backgroundColor: "#fafafa",
                        borderBottom: "1px solid #eee",
                    }}
                >
                    {subtitulo}
                </div>
            )}

            {/* 🔹 Contenido */}
            {!minimizado && (
                <div style={{ padding: "16px" }}>
                    {children}
                </div>
            )}
        </div>
    );
}
export default TarjetaTransparente;
