import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilPuzzle,
  cilSpeedometer,
  cilChartPie,
} from '@coreui/icons'
import { CNavGroup, CNavItem } from '@coreui/react-pro'
import { Translation } from 'react-i18next'

const _menu = [
  {
    component: CNavItem,
    name: <Translation>{(t) => t('Principal')}</Translation>,    
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Temperatura',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,

  },
  {
    component: CNavItem,
    name: 'Velocidad',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
},
  
]

export default _menu
