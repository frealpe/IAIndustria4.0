
import axios from 'axios';
import { getEnvVariables } from '../helpers/getEnvVariables';
const { VITE_API_URL } = getEnvVariables()
//////////////////////////////////////////////
export const iotApi= axios.create({
    baseURL: VITE_API_URL
});
//////////////////////////////////////////////
iotApi.interceptors.request.use(async(config) =>{
  //GET DEL ZUSTAND PARA TENER EL  TOKEN
  const token = localStorage.getItem('token');  
  //console.log(token);
  if(token){config.headers['x-token'] = token;}   
    return config;   
})


