import React from "react";
import { CFormSelect } from '@coreui/react-pro';
import './SidebarCoreUI.css';

const MiniSidebar = ({ activeMiniSidebar, onSelectComponent }) => {
  if (!activeMiniSidebar) return null; // Si no hay un menú activo, no renderiza nada.

  return (
    <>
      {activeMiniSidebar === "viento" && (
        <CFormSelect className="mb-2 custom-select" onChange={onSelectComponent} aria-label="Viento Select">
          <option value="">Vientos..</option>
          <option value="intensidad">Ver Intensidad del Viento</option>
          <option value="direccion">Ver Dirección del Viento</option>
        </CFormSelect>
      )}

      {activeMiniSidebar === "nivelmar" && (
        <CFormSelect className="mb-2 custom-select" onChange={onSelectComponent} aria-label="Nivel Mar Select">
          <option value="">Marea...</option>
          <option value="mareaalta">Marea Alta</option>
          <option value="mareabaja">Marea Baja</option>
        </CFormSelect>
      )}

      {activeMiniSidebar === "temp" && (
        <CFormSelect className="mb-2 custom-select" onChange={onSelectComponent} aria-label="Temperatura Select">
          <option value="">Temperatura...</option>
          <option value="estaciones">Ver Estaciones de Temperatura</option>
        </CFormSelect>
      )}

      {activeMiniSidebar === "corrientes" && (
        <CFormSelect className="mb-2 custom-select" onChange={onSelectComponent} aria-label="Corrientes Select">
          <option value="">Corrientes...</option>
          <option value="velocidad">Ver Velocidad de Corrientes</option>
          <option value="direccion">Ver Dirección de Corrientes</option>
        </CFormSelect>
      )}
    </>
  );
};

export default MiniSidebar;
