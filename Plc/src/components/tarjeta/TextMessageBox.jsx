import React, { useState, useRef } from "react";
import CIcon from "@coreui/icons-react";
import { cilCloudUpload, cilSend } from "@coreui/icons";
import { CButton } from "@coreui/react-pro";
import { procesarXML } from "../help/helps";

function TextMessageBox({ onSendMessage, placeholder, disableCorrections = false }) {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  // 🔹 Envía el mensaje, transformando el XML en JSON si existe
  const handleSendMessage = async (event) => {
    event.preventDefault();

    // No enviar si no hay texto ni archivo
    if (message.trim().length === 0 && !file) return;

    try {
      let fileContent = null;

      if (file) {
        // 🔹 Leemos el contenido del archivo como texto
        let text = await file.text();

        // 🔹 Limpiar BOM si existe
        text = text.replace(/^\uFEFF/, "");

        if (!text || text.trim() === "") {
          alert("El archivo está vacío o no se pudo leer.");
          return;
        }

        // 🔹 Procesar XML solo si termina en .xml o .pnml
        if (file.name.endsWith(".xml") || file.name.endsWith(".pnml")) {
          try {
            console.log("📄 Contenido del archivo (primeros 200 chars):", text.slice(0, 200));

            const limpio = await procesarXML(text);
            console.log("✅ Archivo XML convertido a JSON:", limpio);
            //  const limpio = simplificarXML(obj); // devuelve JSON limpio
            fileContent = limpio;
          } catch (xmlError) {
            console.error("⚠️ Error al procesar XML:", xmlError);
            alert("Error al convertir el archivo XML. Revisa que esté bien formado.");
            return;
          }
        } else {
          // 🔹 Cualquier otro archivo se toma como texto plano
          fileContent = text.trim();
        }
      }

      console.log("Archivo procesado:", fileContent);

      // 🔹 Enviar mensaje y/o archivo convertido
      onSendMessage({
        text: message.trim(),
        file: fileContent,
      });

      // 🔹 Limpiar estado
      setMessage("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("❌ Error general al procesar el mensaje:", err);
      alert("Ocurrió un error al procesar el mensaje o el archivo.");
    }
  };


  // Función auxiliar para convertir XML a JSON


  // 🔹 Manejador de selección de archivo
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    const ext = selectedFile.name.split(".").pop().toLowerCase();
    if (ext !== "xml") {
      alert("Solo se permiten archivos .xml");
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  };

  return (
    <form
      onSubmit={handleSendMessage}
      className="d-flex align-items-center bg-white rounded-3 p-2 position-relative"
      style={{
        height: "4rem",
        border: "1px solid #dee2e6",
        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
      }}
    >
      {/* 🔹 Botón de adjuntar archivo */}
      <div className="me-2">
        <CButton
          color="light"
          className="d-flex align-items-center justify-content-center"
          onClick={() => fileInputRef.current.click()}
          style={{
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            backgroundColor: "#f1f1f1",
            border: "1px solid #ccc",
          }}
        >
          <CIcon
            icon={cilCloudUpload}
            style={{
              color: "#1a1a1a",
              fill: "#1a1a1a",
              opacity: 1,
              width: "20px",
              height: "20px",
            }}
          />
        </CButton>
        <input
          type="file"
          accept=".xml"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      {/* 🔹 Campo de texto */}
      <div className="flex-grow-1">
        <input
          type="text"
          autoFocus
          name="message"
          className="form-control"
          placeholder={placeholder}
          autoComplete={disableCorrections ? "on" : "off"}
          autoCorrect={disableCorrections ? "on" : "off"}
          spellCheck={disableCorrections ? "true" : "false"}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{
            borderRadius: "20px",
            border: "1px solid #ccc",
            height: "38px",
            paddingLeft: "12px",
            color: "#333",
          }}
        />
      </div>

      {/* 🔹 Botón de enviar */}
      <div className="ms-2">
        <CButton
          type="submit"
          color="primary"
          className="d-flex align-items-center"
          style={{
            borderRadius: "20px",
            height: "38px",
            padding: "0 16px",
          }}
        >
          <span className="me-2">Enviar</span>
          <CIcon
            icon={cilSend}
            style={{
              color: "white",
              fill: "white",
              opacity: 1,
              width: "18px",
              height: "18px",
            }}
          />
        </CButton>
      </div>

      {/* 🔹 Nombre del archivo adjunto */}
      {file && (
        <div
          className="position-absolute bottom-100 start-0 bg-light rounded p-2 shadow-sm border text-sm mt-1"
          style={{
            fontSize: "0.85rem",
            whiteSpace: "nowrap",
            maxWidth: "80%",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <CIcon icon={cilCloudUpload} className="me-1 text-primary" />
          {file.name}
        </div>
      )}
    </form>
  );
}

export default React.memo(TextMessageBox);
