// Configurar dotenv con expand PRIMERO, antes de cualquier otro módulo
const dotenv = require("dotenv");
const dotenvExpand = require("dotenv-expand");
const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

// Exportar para que otros archivos puedan usar si necesitan
module.exports = {};
