import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium';
import path from 'node:path'
import autoprefixer from 'autoprefixer'

export default defineConfig(({ mode }) => {
  // Load .env
  const env = loadEnv(mode, process.cwd(), '')
  process.env = { ...process.env, ...env }

  return {

    base: './',
    build: {
      target: "esnext", // Necesario para soportar ESM dinámico
      polyfillModulePreload: false,
      outDir: 'build',
    },
   
    define: {
      'process.env': process.env,
    __APP_ENV__: JSON.stringify(process.env.VITE_PUBLIC_PATH),
    CESIUM_BASE_URL: JSON.stringify(''), // Necesario para que Cesium cargue sus assets correctamente
   },
    css: {
      postcss: {
        plugins: [
          autoprefixer({}), // add options if needed
        ],
      },
    },
    // define: {
    //   // vitejs does not support process.env so we have to redefine it
      
    // },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      force: true,
      include: [],
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    plugins: [react(),cesium(),],
    resolve: {
      alias: [
        {
          find: 'src/',
          replacement: `${path.resolve(__dirname, 'src')}/`,
        },
      ],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
    },
    server: {
      host: true,
      port: 8086,
      strictPort: true,
      https: (process.env.SSL_ENABLED === 'true') ? {
        key: path.resolve(__dirname, '../Servidor/certs/server.key'),
        cert: path.resolve(__dirname, '../Servidor/certs/server.crt'),
      } : false,
      proxy: {
        // https://vitejs.dev/config/server-options.html
      },
    },
  }
})
