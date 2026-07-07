const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `import { createRequire } from 'module';

dotenv.config();

const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');`;

const replacementStr = `import pdfParseModule from 'pdf-parse';

dotenv.config();`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('server.ts', code);
