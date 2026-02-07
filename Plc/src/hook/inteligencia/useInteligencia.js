import { InteligenciaArtificialStore } from '../../store/index'

export const useInteligenciaStore = () => {
  //SE CARGAN HISTORICOS DEL CONSUMO Y DE LAS ALARMAS RELACIONADAS AL DISPOSITIVO
  const envioMensaje = InteligenciaArtificialStore((state) => state.envioMensaje)
  ////////////////////////////////////////////////////////////////
  const envioMensajeIA = async (mensaje) => {
    try {
      const datos = await envioMensaje(mensaje);
      // console.log("Datos recibidos en el hook",datos); 
      return datos
    } catch (error) {
      console.error('Error al cargar el historial:', error)
      throw error // Opcionalmente volver a lanzar el error para un maneenvioMensajejo adicional
    }
  }


  return {
    envioMensajeIA,
  }
  ////////////////////////////////////////////////////////////////
}