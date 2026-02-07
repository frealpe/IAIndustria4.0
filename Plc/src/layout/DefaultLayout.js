import {AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
// import FloatingSidebar from '../components/sidebar/floatingSidebar'

const DefaultLayout = () => {
  return (
    <>
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-50">
        <AppHeader />
        <div className="body flex-grow-1">
          {/* <Principal/> */}
          <AppContent />
        </div>
        <AppFooter />
      </div>
    </>
  )
}

export default DefaultLayout
