import {create} from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import InteligenciaService from '../../service/inteligencia/inteligencia.service';

///////////////////////////////////////////////////////////////
const inteligenciaApi = (set) => ({    
    respuestaIA: undefined,
    ///////////////////////////////////////////////////////////////
    envioMensaje: async(mensaje) => {
        try {
        const {ok,datos}= await InteligenciaService.enviarMensajeIA(mensaje);
        // console.log("Mensaje recibido Store",datos);

        if(!ok){
          set({respuestaIA:undefined});
          return false
        }
          set({respuestaIA:datos});

          return datos;
        } catch (error) {

        }    
      },
    ///////////////////////////////////////////////////////////////


});
export const InteligenciaArtificialStore = create(
    devtools(
      persist(
        inteligenciaApi,
        {name:'inteligencia' }
      )
    )
  );