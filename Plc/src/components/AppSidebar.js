import React from 'react'
import { NavLink } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import CIcon from '@coreui/icons-react'
import { cilSpeedometer } from '@coreui/icons'

import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react-pro'
import { AppSidebarNav } from './AppSidebarNav'

// sidebar nav config
import navigation from '../_nav'


import './AppSidebar.css'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)

  return (
    <CSidebar
      className="custom-sidebar border-end"
      // style={{ height: '50vh' }} 
      colorScheme="light"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand as={NavLink} to="/dashboard" className="text-decoration-none">
           <div className="sidebar-brand-full">
             <CIcon icon={cilSpeedometer} height={24} className="me-2" />
             <div>
               <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>IA 4.0</div>
               <div>CONTROL CENTER</div>
             </div>
           </div>
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      
      <AppSidebarNav items={navigation} />

      <div className="sidebar-footer-custom">
        <div className="footer-status-row">
          <span>Gateway PLC</span>
          <div className="status-dot"></div>
        </div>
        <div className="uptime-counter">
          UPTIME 14:22:05
        </div>
        <div className="uptime-bar">
          <div className="uptime-progress"></div>
        </div>
      </div>

      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
