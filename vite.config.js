import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/esm/StorageUtils.js',
      name: 'KeychainBridge',
      formats: ['es'],
      fileName: (format) => `keychain-bridge.${format}.js`
    },
    rollupOptions: {
      // Make sure to externalize deps that shouldn't be bundled into your library
      external: ['capacitor-secure-storage-plugin'],
      output: {
        globals: {
          'capacitor-secure-storage-plugin': 'SecureStoragePlugin'
        }
      }
    }
  }
});
