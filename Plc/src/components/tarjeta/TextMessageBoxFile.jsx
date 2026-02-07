import React, { useRef, useState } from 'react';

function TextMessageBoxFile({ onSendMessage, placeholder, disableCorrections = false, accept }) {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const inputFileRef = useRef(null);

  const handleSendMessage = (event) => {
    event.preventDefault();

    // Evitar enviar vacío
    if (!message.trim() && !selectedFile) return;

    // Enviar mensaje + archivo (si existe)
    onSendMessage(message, selectedFile);

    // Limpiar campos
    setMessage('');
    setSelectedFile(null);
    if (inputFileRef.current) inputFileRef.current.value = '';
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    setSelectedFile(file);
  };

  return (
    <form
      onSubmit={handleSendMessage}
      className="flex flex-row items-center h-16 rounded-xl bg-white w-full px-4"
    >
      {/* Botón para adjuntar archivo */}
      <div className="mr-3">
        <button
          type="button"
          className="flex items-center justify-center text-gray-400 hover:text-gray-600"
          onClick={() => inputFileRef.current?.click()}
        >
          <i className="fa-solid fa-paperclip text-xl"></i>
        </button>

        <input
          type="file"
          ref={inputFileRef}
          accept={accept}
          onChange={handleFileSelect}
          hidden
        />
      </div>

      {/* Campo de texto */}
      <div className="flex-grow">
        <div className="relative w-full">
          <input
            type="text"
            autoFocus
            name="message"
            className="flex w-full border rounded-xl text-gray-800 focus:outline-none focus:border-indigo-300 pl-4 h-10"
            placeholder={placeholder}
            autoComplete={disableCorrections ? 'on' : 'off'}
            autoCorrect={disableCorrections ? 'on' : 'off'}
            spellCheck={disableCorrections ? 'true' : 'false'}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </div>

      {/* Botón Enviar */}
      <div className="ml-4">
        <button
          type="submit"
          className="btn-primary flex items-center"
          disabled={!message.trim() && !selectedFile}
        >
          <span className="mr-2">
            {selectedFile
              ? selectedFile.name.length > 15
                ? `${selectedFile.name.substring(0, 12)}...`
                : selectedFile.name
              : 'Enviar'}
          </span>
          <i className="fa-regular fa-paper-plane"></i>
        </button>
      </div>
    </form>
  );
}

export default React.memo(TextMessageBoxFile);
