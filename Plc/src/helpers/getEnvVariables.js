export const getEnvVariables = () => {

    import.meta.env;

    return {
         ...import.meta.env
        //VITE_CESIUM_TOKEN: import.meta.env.VITE_CESIUM_TOKEN,
    }
}