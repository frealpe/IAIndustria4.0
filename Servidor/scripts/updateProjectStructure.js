const fs = require('fs');
const path = require('path');

/**
 * Script para generar automáticamente el archivo projectStructure.json
 * Escanea el directorio raíz del proyecto y crea un árbol de directorios.
 */

const projectRoot = path.resolve(__dirname, '../../'); // Subir dos niveles desde scripts/ (Servidor/scripts -> Servidor -> Root)
// Ajuste: Si el script está en /home/fabio/Escritorio/IA/MCP/Servidor/scripts
// __dirname = .../Servidor/scripts
// ../ = .../Servidor
// ../../ = .../MCP (Root del proyecto)
// Validar esto. El usuario dijo que el root es /home/fabio/Escritorio/IA/MCP

const outputPaths = [
    path.join(__dirname, '../constants/projectStructure.json'), // Servidor/constants
    path.resolve(__dirname, '../../Plc/src/service/projectStructure.json') // Plc/src/service
];

// Directorios y archivos a ignorar
const ignoreList = [
    'node_modules',
    '.git',
    '.venv',
    'dist',
    'build',
    'coverage',
    '__pycache__',
    '.DS_Store',
    '.env',
    'package-lock.json',
    'yarn.lock',
    'Documentacion', // Excluir carpeta de documentación
    'public.zip', // Excluir archivo zip grande
    'Principal.pdf' // Excluir PDF principal
];

function getDirectoryStructure(dirPath) {
    const stats = fs.statSync(dirPath);
    const item = {
        path: dirPath,
        name: path.basename(dirPath),
    };

    if (stats.isDirectory()) {
        let children = [];
        try {
            children = fs.readdirSync(dirPath)
                .filter(child => !ignoreList.includes(child)) // Filter out ignored files/dims
                .map(child => getDirectoryStructure(path.join(dirPath, child)))
                .filter(child => child !== null); // Filter out nulls from recursive calls
        } catch (e) {
            console.warn(`⚠️ [ProjectStructure] No se pudo leer directorio: ${dirPath}`);
        }

        if (children.length > 0) {
            item.children = children;
        }
    } else {
        item.size = stats.size;
    }

    return item;
}

function generateProjectStructure() {
    console.log('🔄 [ProjectStructure] Generando estructura del proyecto...');
    
    // El root es ../../ desde scripts/ = /home/fabio/Escritorio/IA/MCP
    const rootDir = path.resolve(__dirname, '../../');
    
    if (!fs.existsSync(rootDir)) {
        console.error(`❌ [ProjectStructure] Directorio raíz no encontrado: ${rootDir}`);
        return;
    }

    try {
        const structure = getDirectoryStructure(rootDir);
        const jsonContent = JSON.stringify(structure, null, 2);

        // Rutas de salida: Una en Servidor/constants, otra en Plc/src/service
        const targets = [
            path.join(__dirname, '../constants/projectStructure.json'),
            path.resolve(__dirname, '../../Plc/src/service/projectStructure.json')
        ];

        targets.forEach(target => {
            const dir = path.dirname(target);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(target, jsonContent);
            console.log(`✅ [ProjectStructure] Archivo actualizado: ${target}`);
        });

    } catch (error) {
        console.error('❌ [ProjectStructure] Error fatal:', error.message);
    }
}

module.exports = { generateProjectStructure };

// Permitir ejecución directa con node
if (require.main === module) {
    generateProjectStructure();
}
