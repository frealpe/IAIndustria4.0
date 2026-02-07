import React from 'react'

const Mediciones = React.lazy(() => import('./views/mediciones/principal'))

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


]

export default routes
