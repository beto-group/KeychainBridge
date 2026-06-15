const { KeychainProvider } = dc.require("./providers/KeychainProvider.js");

// Attempt to load Capacitor Secure Storage if available in the host environment
let SecureStoragePlugin = null;
try {
    // This expects Sovereign Inspector to have @capacitor-community/secure-storage installed
    const capSecure = require('@capacitor-community/secure-storage');
    SecureStoragePlugin = capSecure.SecureStoragePlugin;
} catch (e) {
    // Will be null if not running in Capacitor environment
}

class MobileCapacitorProvider extends KeychainProvider {
    constructor() {
        super();
        this.prefix = "datacore_keychain_";
    }

    async listSecrets() {
        if (!SecureStoragePlugin) return [];
        try {
            const { keys } = await SecureStoragePlugin.keys();
            return keys.filter(k => k.startsWith(this.prefix)).map(k => k.replace(this.prefix, ''));
        } catch (e) {
            console.error("[CapacitorKeychain] listSecrets failed", e);
            return [];
        }
    }

    async getSecret(id) {
        if (!SecureStoragePlugin) return null;
        try {
            const { value } = await SecureStoragePlugin.get({ key: this.prefix + id });
            return value;
        } catch (e) {
            // Usually throws if not found
            return null;
        }
    }

    async setSecret(id, val) {
        if (!SecureStoragePlugin) return;
        try {
            await SecureStoragePlugin.set({ key: this.prefix + id, value: val });
        } catch (e) {
            console.error("[CapacitorKeychain] setSecret failed", e);
        }
    }

    async deleteSecret(id) {
        if (!SecureStoragePlugin) return;
        try {
            await SecureStoragePlugin.remove({ key: this.prefix + id });
        } catch (e) {
            console.error("[CapacitorKeychain] deleteSecret failed", e);
        }
    }
}

return { MobileCapacitorProvider };
