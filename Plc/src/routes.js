import React from 'react'

const Mediciones = React.lazy(() => import('./views/mediciones/principal'))
const Analitica = React.lazy(() => import('./views/analitica/Analitica'))
const Control = React.lazy(() => import('./views/control/Control'))
const Asistente = React.lazy(() => import('./views/asistente/Asistente'))
const Historial = React.lazy(() => import('./views/analitica/Historial'))
const Training = React.lazy(() => import('./views/analitica/Training'))
const Dispositivos = React.lazy(() => import('./views/control/Dispositivos'))
const Ajustes = React.lazy(() => import('./views/control/Ajustes'))

const routes = [
  { 
    path: '/', 
    exact: true, 
    name: 'Mediciones', 
    element: Mediciones,
  },

  {
    path: '/mediciones',
    name: 'Mediciones',
    element: Mediciones,
    exact: true,
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    element: Mediciones, // Reusing existing view for now
    exact: true,
  },
  {
    path: '/analitica',
    name: 'Analítica',
    element: Analitica,
    exact: true,
  },
  {
    path: '/control',
    name: 'Control',
    element: Control,
    exact: true,
  },
  {
    path: '/historial',
    name: 'Historial',
    element: Historial,
    exact: true,
  },
  {
    path: '/training',
    name: 'IA Training',
    element: Training,
    exact: true,
  },
  {
    path: '/dispositivos',
    name: 'Dispositivos',
    element: Dispositivos,
    exact: true,
  },
  {
    path: '/ajustes',
    name: 'Ajustes',
    element: Ajustes,
    exact: true,
  },


]

export default routes
