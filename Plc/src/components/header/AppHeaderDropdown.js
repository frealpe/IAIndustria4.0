import React from 'react'  // Importa la librería React
import { useTranslation } from 'react-i18next'  // Importa el hook para la traducción

import {
  CAvatar,  // Componente de avatar de CoreUI
  CDropdown,  // Componente de menú desplegable
  CDropdownHeader,  // Encabezado del menú desplegable
  CDropdownItem,  // Elemento dentro del menú desplegable
  CDropdownMenu,  // Contenedor del menú desplegable
  CDropdownToggle,  // Botón para abrir el menú desplegable
} from '@coreui/react-pro'  // Importa los componentes de CoreUI Pro

import {
  cilAccountLogout,  // Icono de cierre de sesión
} from '@coreui/icons'  // Importa los iconos de CoreUI

import CIcon from '@coreui/icons-react'  // Importa el componente de icono de CoreUI


const AppHeaderDropdown = () => {
  const { t } = useTranslation()  // Hook para la traducción de textos

  return (
    <CDropdown variant="nav-item" alignment="end">  {/* Menú desplegable alineado a la derecha */}

      <CDropdownToggle className="py-0" caret={false}>  {/* Botón sin flecha desplegable */}
      </CDropdownToggle>
    
      <CDropdownMenu className="pt-0">  {/* Menú desplegable con padding superior 0 */}
        <CDropdownHeader className="bg-body-secondary text-body-secondary fw-semibold rounded-top mb-2">
          {t('Administrador')}  {/* Muestra el texto traducido "Administrador" */}
        </CDropdownHeader>
        
        <CDropdownItem href="#">  {/* Elemento del menú con enlace */}
          <CIcon icon={cilAccountLogout} className="me-2" />  {/* Icono de cierre de sesión */}
          {t('login')}  {/* Texto traducido para "login" */}
        </CDropdownItem>
      </CDropdownMenu>

    </CDropdown>
  )
}

export default AppHeaderDropdown  // Exporta el componente para su uso en otros archivos
