const fs = require('fs');
const path = require('path');

const rootDir = '/home/fabio/Escritorio/IA/MCP';
const outputFile = '/home/fabio/Escritorio/IA/MCP/Plc/src/service/projectStructure.json';

const ignoredDirs = [
    '.git', 
    '.gitignore', 
    '.idea', 
    '.vscode', 
    'node_modules', 
    'dist', 
    'build', 
    '.pio', 
    '__pycache__',
    'coverage',
    '.DS_Store'
];

function getDirectoryStructure(dirPath) {
    const stats = fs.statSync(dirPath);
    const name = path.basename(dirPath);
    
    if (!stats.isDirectory()) {
        return {
            path: dirPath,
            name: name
        };
    }

    const children = fs.readdirSync(dirPath)
        .filter(child => !ignoredDirs.includes(child))
        .map(child => getDirectoryStructure(path.join(dirPath, child)))
        .filter(child => child !== null); // Filter out nulls if any

    return {
        path: dirPath,
        name: name,
        children: children.length > 0 ? children : undefined
    };
}

try {
    console.log(`Scanning directory: ${rootDir}`);
    const structure = getDirectoryStructure(rootDir);
    
    fs.writeFileSync(outputFile, JSON.stringify(structure, null, 2));
    console.log(`Successfully updated structure file at: ${outputFile}`);
} catch (error) {
    console.error('Error scanning directory:', error);
}
