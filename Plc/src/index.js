import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'core-js'
import 'cesium/Build/Cesium/Widgets/widgets.css';
import App from './App'
import store from './store'
import { SocketProvider } from './context/SocketContext';
//import { SocketProvider } from '../../context/SocketContext';

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
            <SocketProvider>
                 <App />
            </SocketProvider>
  </Provider>,
)
