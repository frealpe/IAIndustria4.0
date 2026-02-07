# Proyecto de Automatización: Interfaz Frontend (PLC)

Este directorio contiene la aplicación frontend del proyecto, desarrollada en React utilizando la plantilla CoreUI. Actúa como la interfaz principal para visualizar y controlar el sistema de automatización.

## Requisitos Previos

Asegúrate de tener instalado:
- **Node.js** (versión 16 o superior recomendada)
- **npm** o **yarn**

## Instalación

Para instalar todas las dependencias necesarias, ejecuta:

```bash
npm install
# O si prefieres yarn:
yarn install
```

## Ejecución

### Modo Desarrollo
Para iniciar el servidor de desarrollo con recarga automática (hot-reload):

```bash
npm start
```
Por defecto, la aplicación estará disponible en [http://localhost:5173](http://localhost:5173) (o el puerto que Vite asigne automáticamente).

### Modo Producción (Build)
Para compilar la aplicación para producción:

```bash
npm run build
```
Los archivos compilados se generarán en la carpeta `build/`.

### Previsualización
Para probar la versión compilada localmente:

```bash
npm run serve
```

---
**Nota:** Este proyecto se basa en [CoreUI PRO React Admin Template](https://coreui.io/product/react-dashboard-template/).
