const fs = require('fs');
const path = require('path');

const rootDir = '/home/fabio/Escritorio/IA/MCP';
const outputFile = '/home/fabio/Escritorio/IA/MCP/Plc/src/service/projectStructure.json';

const ignored = [
    '.git',
    '.gitignore',
    'node_modules',
    '.DS_Store',
    'dist',
    'build',
    '.vn',
    '.vscode',
    '.idea',
    '__pycache__',
    'coverage',
    '.env',
    '.env.local',
    '.env.development.local',
    '.env.test.local',
    '.env.production.local',
    '.npm',
    '.cache',
    'tmp',
    'temp',
    '.venv',
    '.pio',
    'Documentacion', // Excluir documentación
    'public.zip', // Excluir zip grande
    'Principal.pdf' // Excluir PDF principal
];

function getStructure(dir) {
    const name = path.basename(dir);
    const stats = fs.statSync(dir);

    if (stats.isDirectory()) {
        const children = fs.readdirSync(dir)
            .filter(child => !ignored.includes(child)) // Filter out ignored files/dirs
            .map(child => getStructure(path.join(dir, child)))
            .filter(child => child !== null); // Remove nulls if any

        // Sort: Directories first, then files
        children.sort((a, b) => {
            if (a.children && !b.children) return -1;
            if (!a.children && b.children) return 1;
            return a.name.localeCompare(b.name);
        });

        return {
            path: dir,
            name: name,
            children: children
        };
    } else {
        return {
            path: dir,
            name: name,
            size: stats.size
        };
    }
}

console.log(`Scanning directory: ${rootDir}`);
try {
    const structure = getStructure(rootDir);
    fs.writeFileSync(outputFile, JSON.stringify(structure, null, 2));
    console.log(`Project structure saved to ${outputFile}`);
} catch (error) {
    console.error('Error generating project structure:', error);
}
