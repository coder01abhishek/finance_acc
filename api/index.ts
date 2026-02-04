// api/index.ts (Root Folder)

// Use require for CommonJS compatibility
const app = require('../server/index');

// Vercel expects the function to be exported like this for CommonJS
module.exports = app;