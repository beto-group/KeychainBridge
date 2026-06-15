import fs from 'fs';
import path from 'path';

const SRC_DIR = 'src';
const DEST_DIR = 'src/esm';

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function processDirectory(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
        // Skip the esm generation folder itself to avoid infinite loops
        if (entry.name === 'esm') continue;
        
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
            processDirectory(fullPath);
        } else if (entry.isFile() && (fullPath.endsWith('.js') || fullPath.endsWith('.jsx'))) {
            transformFile(fullPath);
        }
    }
}

function transformFile(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');

    // 1. Convert `dc.require(dc.resolvePath("..."))` to `import`
    code = code.replace(/const\s+\{\s*([^}]+)\s*\}\s*=\s*(?:await\s+)?dc\.require\(dc\.resolvePath\(["']([^"']+)["']\)\);/g, 'import { $1 } from "$2";');
    
    // 2. Convert `return { X };` to `export { X };`
    // Handle aliases like `return { KeychainBridge: KeychainBridgeApp };` -> `export { KeychainBridgeApp as KeychainBridge };`
    code = code.replace(/^return\s+\{\s*([^}]+)\s*\};?\s*$/m, (match, p1) => {
        const exports = p1.split(',').map(item => {
            const parts = item.split(':').map(s => s.trim());
            return parts.length === 2 ? `${parts[1]} as ${parts[0]}` : parts[0];
        }).join(', ');
        return `export { ${exports} };`;
    });

    // 3. Inject global Datacore Context Bridge
    code = `const dc = window.dc || window.datacore;\n\n${code}`;

    // Calculate dest path
    const relativePath = path.relative(SRC_DIR, filePath);
    const destPath = path.join(DEST_DIR, relativePath);
    ensureDir(path.dirname(destPath));
    
    fs.writeFileSync(destPath, code);
    console.log(`[Bridge] Transformed ${relativePath}`);
}

// 1. Clean and recreate dest dir
if (fs.existsSync(DEST_DIR)) {
    fs.rmSync(DEST_DIR, { recursive: true, force: true });
}
ensureDir(DEST_DIR);

// 2. Process all files
processDirectory(SRC_DIR);

// 3. Generate the Sovereign Inspector WASM/ESM Entrypoint
const entrypointPath = path.join(DEST_DIR, 'index.jsx');
const entrypointCode = `
import { KeychainBridge } from "KEYCHAIN BRIDGE/src/App.jsx";

export function mount_app(container, dc, options = {}) {
    // Inject React and ReactDOM into global scope if missing (for preact/compat)
    if (!window.React) window.React = dc.preact;
    if (!window.ReactDOM) window.ReactDOM = dc.preact;

    const { h, render } = dc.preact;
    
    const props = {
        folderPath: options.folderPath || "KEYCHAIN BRIDGE",
        isFullTab: options.isFullTab !== undefined ? options.isFullTab : true,
        onCodeReloadRequest: options.onCodeReloadRequest || (() => {}),
        onToggleFullTab: options.onToggleFullTab || (() => {}),
        dc
    };

    // Render the App into the container
    render(h(KeychainBridge, props), container);

    // Return a cleanup function for when the plugin is unloaded
    return () => {
        render(null, container);
    };
}
`;
fs.writeFileSync(entrypointPath, entrypointCode);
console.log(`[Bridge] Generated Entrypoint: src/esm/index.jsx`);
console.log('[Bridge] ESM Generation Complete.');
