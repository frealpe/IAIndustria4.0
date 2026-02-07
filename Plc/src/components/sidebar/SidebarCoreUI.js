import React, { useState, useRef, useEffect } from 'react';
import {
  CSidebar,
  CSidebarNav,
  CNavItem,
  CNavLink,
} from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import { cilCloud, cilDrop, cilSun, cilChart } from '@coreui/icons';
import MiniSidebar from './MiniSidebar';
import './SidebarCoreUI.css';
import { useEstadosStore } from '../../hook';

const SidebarCoreUI = () => {
  // Hook para controlar el estado global de la capa animada
  const { setestadoVentana } = useEstadosStore();

  // Estado local: controla qué MiniSidebar está activo
  const [activeMiniSidebar, setActiveMiniSidebar] = useState(null);
  // Estado local: guarda la opción seleccionada dentro de la MiniSidebar
  const [selectedOption, setSelectedOption] = useState(null);

  // Refs para detectar clics fuera de los elementos activos
  const itemRefs = {
    viento: useRef(null),
    nivelmar: useRef(null),
    temp: useRef(null),
    corrientes: useRef(null),
  };
  const miniSidebarRef = useRef(null);

  /**
   * Alterna la visibilidad de una MiniSidebar específica.
   * Si se selecciona la opción "corrientes", permite mantener la capa activa,
   * de lo contrario, la desactiva.
   */
  const toggleMiniSidebar = (name) => {
    setActiveMiniSidebar((prev) => {
      const nuevoEstado = prev === name ? null : name;
      if (nuevoEstado !== 'corrientes') {
        setestadoVentana(false); // Desactiva la capa para otras opciones
      }
      return nuevoEstado;
    });
  };

  /**
   * Efecto: ejecutado cuando cambia `selectedOption`.
   * Activa o desactiva la capa según la opción seleccionada.
   */
  useEffect(() => {
    if (!selectedOption) return;

    // console.log(`Opción seleccionada: ${selectedOption}`);

  // Verificamos si la opción seleccionada es "velocidad", "direccion" o "corriente"
    const activar = selectedOption === "velocidad" || selectedOption === "direccion" || selectedOption === "corriente";    
    setestadoVentana(activar);

    // console.log(`Capa ${activar ? "activada" : "desactivada"} por opción: ${selectedOption}`);
  }, [selectedOption]);

  /**
   * Maneja la selección de una opción desde el MiniSidebar.
   */
  const onSelectComponent = (e) => {
    const selectedValue = e.target.value;
    // console.log(selectedValue);
    setSelectedOption(selectedValue);
  };

  /**
   * Efecto: cierra el MiniSidebar si se hace clic fuera de él y de los botones del menú.
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideMiniSidebar =
        miniSidebarRef.current &&
        !miniSidebarRef.current.contains(event.target);

      const clickedOutsideNavItems = !Object.values(itemRefs).some(
        (ref) => ref.current && ref.current.contains(event.target)
      );

      if (clickedOutsideMiniSidebar && clickedOutsideNavItems) {
        setActiveMiniSidebar(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="sidebar-container" style={{ position: 'relative' }}>
      <CSidebar
        visible
        className="sidebar-coreui-right"
        style={{
          backgroundColor: 'rgba(14, 12, 2, 0.9)',
          color: '#fff',
          position: 'absolute',
          right: 0,
          left: 'auto',
          zIndex: 100,
        }}
      >
        <CSidebarNav style={{ padding: '8px' }}>
          {/* Opción: Viento */}
          <CNavItem>
            <CNavLink
              ref={itemRefs.viento}
              onClick={() => toggleMiniSidebar('viento')}
              role="button"
              style={{ cursor: 'pointer', color: '#fff' }}
            >
              <CIcon icon={cilCloud} className="me-2" />
              Viento
            </CNavLink>
          </CNavItem>

          {/* Opción: Nivel Mar */}
          <CNavItem>
            <CNavLink
              ref={itemRefs.nivelmar}
              onClick={() => toggleMiniSidebar('nivelmar')}
              role="button"
              style={{ cursor: 'pointer', color: '#fff' }}
            >
              <CIcon icon={cilDrop} className="me-2" />
              Nivel Mar
            </CNavLink>
          </CNavItem>

          {/* Opción: Temperatura */}
          <CNavItem>
            <CNavLink
              ref={itemRefs.temp}
              onClick={() => toggleMiniSidebar('temp')}
              role="button"
              style={{ cursor: 'pointer', color: '#fff' }}
            >
              <CIcon icon={cilSun} className="me-2" />
              Temp
            </CNavLink>
          </CNavItem>

          {/* Opción: Corrientes */}
          <CNavItem>
            <CNavLink
              ref={itemRefs.corrientes}
              onClick={() => toggleMiniSidebar('corrientes')}
              role="button"
              style={{ cursor: 'pointer', color: '#fff' }}
            >
              <CIcon icon={cilChart} className="me-2" />
              Corrientes
            </CNavLink>
          </CNavItem>
        </CSidebarNav>
      </CSidebar>

      {/* MiniSidebar flotante, se muestra si está activo */}
      <MiniSidebar
        activeMiniSidebar={activeMiniSidebar}
        miniSidebarRef={miniSidebarRef}
        onSelectComponent={onSelectComponent}
      />
    </div>
  );
};

export default SidebarCoreUI;
