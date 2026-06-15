import fs from 'fs';
import path from 'path';

const SRC_DIR = 'src/utils';
const DEST_DIR = 'src/esm';

if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
}

function processDatacoreToEsm(filePath, destPath) {
    let code = fs.readFileSync(filePath, 'utf8');

    // Replace dc.require for CryptoUtils specifically
    code = code.replace(/const\s+\{\s*Crypto\s*\}\s*=\s*dc\.require[^;]+;/g, 'import { Crypto } from "./CryptoUtils.js";');

    // 2. Replace Datacore return object with ES6 export
    // Matches: return { Storage };
    // Output: export { Storage };
    code = code.replace(/^return\s+\{\s*([^}]+)\s*\};?\s*$/m, 'export { $1 };');

    fs.writeFileSync(destPath, code);
    console.log(`[Bridge] Transformed ${path.basename(filePath)} -> ESM`);
}

processDatacoreToEsm(path.join(SRC_DIR, 'CryptoUtils.js'), path.join(DEST_DIR, 'CryptoUtils.js'));
processDatacoreToEsm(path.join(SRC_DIR, 'StorageUtils.js'), path.join(DEST_DIR, 'StorageUtils.js'));

console.log('[Bridge] ESM Generation Complete.');
