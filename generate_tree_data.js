const fs = require('fs');
const path = require('path');

const rootPath = '/home/fabio/Escritorio/IA/MCP';
const excludeDirs = ['node_modules', '.git', 'build', 'dist', '.gemini', '.antigravity', '.qodo', '.vscode', '.pio'];

function dirTree(filename) {
    const stats = fs.lstatSync(filename);
    const info = {
        path: filename,
        name: path.basename(filename)
    };

    if (stats.isDirectory()) {
        if (excludeDirs.includes(info.name)) return null;
        info.children = fs.readdirSync(filename)
            .map(child => dirTree(path.join(filename, child)))
            .filter(child => child !== null);
    } else {
        info.size = stats.size;
    }

    return info;
}

const tree = dirTree(rootPath);
const outputPathPlc = path.join(rootPath, 'Plc/src/service/projectStructure.json');
const outputPathServidor = path.join(rootPath, 'Servidor/constants/projectStructure.json');

fs.writeFileSync(outputPathPlc, JSON.stringify(tree, null, 2));
fs.writeFileSync(outputPathServidor, JSON.stringify(tree, null, 2));

console.log('✅ Project structure JSON updated in both Frontend and Backend constants.');
