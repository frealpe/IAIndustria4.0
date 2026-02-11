const fs = require('fs');
const path = require('path');

const rootPath = '/home/fabio/Escritorio/IA/MCP';
const excludeDirs = ['node_modules', '.git', 'build', 'dist', '.gemini', '.antigravity', '.qodo', '.vscode'];

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
        // info.size = stats.size;
    }

    return info;
}

const tree = dirTree(rootPath);
fs.writeFileSync(path.join(rootPath, 'Plc/src/service/projectStructure.json'), JSON.stringify(tree, null, 2));
console.log('Project structure JSON generated at Plc/src/service/projectStructure.json');
