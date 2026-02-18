import { iotApi } from "../../api/iotApi";

class InteligenciaService {
  static enviarMensajeIA = async (mensaje) => {
    try {
        
        // Enviar a la API con la llave correcta 'message'
        const payload = {
            message: mensaje.mensaje 
        };
        const resp = await iotApi.post('chat', payload); 
        const datos = resp.data;
        // console.log("Respuesta del servicio", datos);
        return {
        ok: true,
        datos: {
          conversacion: datos.response,
          resultado: datos.data, 
          visualization: datos.visualization, // Map visualization from backend
          tipo: null
        }
      };
    } catch (error) {
      console.error(error);
      const errorMessage = "Las estaciones no se pudieron cargar";  
      return {
        ok: false,
        errorMessage,
      };
    }
  };
}

export default InteligenciaService;
