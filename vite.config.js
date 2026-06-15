import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'KEYCHAIN BRIDGE/src': path.resolve(__dirname, 'src/esm')
    }
  },
  build: {
    lib: {
      entry: 'src/esm/index.jsx',
      name: 'KeychainBridge',
      formats: ['es'],
      fileName: (format) => `keychain-bridge.${format}.js`
    },
    rollupOptions: {
      // Externalize capacitor so it doesn't try to bundle native bridge
      external: ['capacitor-secure-storage-plugin']
    }
  },
  esbuild: {
    jsxFactory: 'dc.preact.h',
    jsxFragment: 'dc.preact.Fragment'
  }
});
