import React, { useEffect, useRef, useContext } from 'react'  // Importa React y los hooks useEffect, useRef y useContext
import { NavLink } from 'react-router-dom'  // Importa NavLink para la navegación
import { useSelector, useDispatch } from 'react-redux'  // Importa hooks de Redux para manejar el estado global
import { useTranslation } from 'react-i18next'  // Importa el hook para la traducción

// Importa componentes de CoreUI
import {
  CContainer,  // Contenedor de Bootstrap de CoreUI
  CDropdown,  // Menú desplegable
  CDropdownItem,  // Elemento dentro del menú desplegable
  CDropdownMenu,  // Contenedor del menú desplegable
  CDropdownToggle,  // Botón para activar el menú desplegable
  CHeader,  // Encabezado de la aplicación
  CHeaderNav,  // Barra de navegación dentro del encabezado
  CHeaderToggler,  // Botón para alternar el sidebar
  CNavLink,  // Enlace dentro de la barra de navegación
  CNavItem,  // Elemento de navegación
  useColorModes,  // Hook para manejar los modos de color (claro/oscuro)
} from '@coreui/react-pro'

import CIcon from '@coreui/icons-react'  // Importa el componente de icono de CoreUI

// Importa iconos de CoreUI
import {
  cilContrast,  // Icono para modo automático
  cilApplicationsSettings,  // Icono de configuración (no utilizado en el código)
  cilMenu,  // Icono del botón de menú
  cilMoon,  // Icono de modo oscuro
  cilSun,  // Icono de modo claro
  cilLanguage,  // Icono de selección de idioma
  cifGb,  // Icono de bandera del Reino Unido
  cifEs,  // Icono de bandera de España
  cifPl,  // Icono de bandera de Polonia (no utilizado en el código)
} from '@coreui/icons'

import {
  AppHeaderDropdown,  // Importa el componente AppHeaderDropdown (menú de usuario)
} from './header/index'
import { SocketContext } from '../context/SocketContext'

const AppHeader = () => {
  const headerRef = useRef()  // Crea una referencia para el encabezado

  // Hook para manejar el modo de color con un tema predeterminado
  const { colorMode, setColorMode } = useColorModes('coreui-pro-react-admin-template-theme-light')

  // Hook para traducción
  const { i18n, t } = useTranslation()

  const dispatch = useDispatch()  // Hook para enviar acciones a Redux
  const asideShow = useSelector((state) => state.asideShow)  // Obtiene el estado del aside
  const sidebarShow = useSelector((state) => state.sidebarShow)  // Obtiene el estado del sidebar

  useEffect(() => {
    // Agrega un evento para cambiar la sombra del header al hacer scroll
    document.addEventListener('scroll', () => {
      headerRef.current &&
        headerRef.current.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    })
  }, [])  // Se ejecuta una sola vez al montar el componente

  const { online } = useContext(SocketContext)

  return (
    <CHeader position="sticky" className="mb-4 p-0" ref={headerRef}>  {/* Encabezado fijo con padding 0 */}
      <CContainer className="border-bottom px-4" fluid>  {/* Contenedor con borde inferior y padding horizontal */}

        {/* Botón para alternar la visibilidad del sidebar */}
        <CHeaderToggler
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          style={{ marginInlineStart: '-14px' }}  // Ajusta el margen izquierdo
        >
          <CIcon icon={cilMenu} size="lg" />  {/* Icono de menú */}
        </CHeaderToggler>
        <span className={`ms-3 fw-bold ${online ? 'text-success' : 'text-danger'}`}>
          IA 4.0 {online ? 'Online' : 'Offline'}
        </span>
        
        {/* Barra de navegación dentro del encabezado */}
        <CHeaderNav className="ms-auto ms-md-0">
          {/* Separador vertical */}
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>

          {/* Menú desplegable para seleccionar el idioma */}
          <CDropdown variant="nav-item" placement="bottom-end">
            <CDropdownToggle caret={false}>  {/* Botón sin flecha */}
              <CIcon icon={cilLanguage} size="lg" />  {/* Icono de idioma */}
            </CDropdownToggle>
            <CDropdownMenu>
              {/* Opción para cambiar a inglés */}
              <CDropdownItem
                active={i18n.language === 'en'}
                className="d-flex align-items-center"
                as="button"
                onClick={() => i18n.changeLanguage('en')}
              >
                <CIcon className="me-2" icon={cifGb} size="lg" /> English
              </CDropdownItem>
              
              {/* Opción para cambiar a español */}
              <CDropdownItem
                active={i18n.language === 'es'}
                className="d-flex align-items-center"
                as="button"
                onClick={() => i18n.changeLanguage('es')}
              >
                <CIcon className="me-2" icon={cifEs} size="lg" /> Español
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>

          {/* Menú desplegable para cambiar el modo de color */}
          <CDropdown variant="nav-item" placement="bottom-end">            
            <CDropdownToggle caret={false}>
              {/* Muestra el icono según el modo de color actual */}
              {colorMode === 'dark' ? (
                <CIcon icon={cilMoon} size="lg" />
              ) : colorMode === 'auto' ? (
                <CIcon icon={cilContrast} size="lg" />
              ) : (
                <CIcon icon={cilSun} size="lg" />
              )}
            </CDropdownToggle>

            <CDropdownMenu>
              {/* Opción para cambiar al modo claro */}
              <CDropdownItem
                active={colorMode === 'light'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('light')}
              >
                <CIcon className="me-2" icon={cilSun} size="lg" /> {t('light')}
              </CDropdownItem>

              {/* Opción para cambiar al modo oscuro */}
              <CDropdownItem
                active={colorMode === 'dark'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('dark')}
              >
                <CIcon className="me-2" icon={cilMoon} size="lg" /> {t('dark')}
              </CDropdownItem>
              
              {/* Opción para cambiar al modo automático */}
              <CDropdownItem
                active={colorMode === 'auto'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => setColorMode('auto')}
              >
                <CIcon className="me-2" icon={cilContrast} size="lg" /> Auto
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>

          {/* Separador vertical */}
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>

          {/* Menú de usuario */}
          <AppHeaderDropdown />
        </CHeaderNav>     
      </CContainer>
    </CHeader>
  )
}

export default AppHeader  // Exporta el componente para su uso en otros archivos
