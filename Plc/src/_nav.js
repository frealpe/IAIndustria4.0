import CIcon from '@coreui/icons-react'
import { cilPuzzle, cilSpeedometer, cibAudible,cibCoursera,cibCodeship,cibElectron,cibBlackberry } from '@coreui/icons'
import { CNavGroup, CNavItem } from '@coreui/react-pro'

const _nav = [
  {
    component: CNavItem,
    name: 'Mediciones',
    to: '/mediciones',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,

  },

]

export default _nav
