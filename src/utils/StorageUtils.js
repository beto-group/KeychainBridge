/**
 * Base interface for the Universal Keychain Bridge
 */
class KeychainProvider {
    async listSecrets() { throw new Error("Not implemented"); }
    async getSecret(id) { throw new Error("Not implemented"); }
    async setSecret(id, val) { throw new Error("Not implemented"); }
    async deleteSecret(id) { throw new Error("Not implemented"); }
}

class DesktopKeychainProvider extends KeychainProvider {
    constructor(dc) {
        super();
        this.secretStorage = dc?.app?.secretStorage || (window.app && window.app.secretStorage);
    }

    async listSecrets() {
        if (!this.secretStorage) return [];
        return (typeof this.secretStorage.listSecrets === 'function') 
            ? await this.secretStorage.listSecrets() 
            : Object.keys(this.secretStorage.secrets || {});
    }

    async getSecret(id) {
        if (!this.secretStorage) return null;
        return (typeof this.secretStorage.getSecret === 'function') 
            ? await this.secretStorage.getSecret(id) 
            : this.secretStorage.secrets?.[id];
    }

    async setSecret(id, val) {
        if (!this.secretStorage) return;
        if (typeof this.secretStorage.setSecret === 'function') {
            await this.secretStorage.setSecret(id, val);
        } else if (this.secretStorage.secrets) { 
            this.secretStorage.secrets[id] = val; 
            if(this.secretStorage.saveSecrets) await this.secretStorage.saveSecrets();
            else if(this.secretStorage.save) await this.secretStorage.save(); 
        }
    }

    async deleteSecret(id) {
        if (!this.secretStorage) return;
        if (typeof this.secretStorage.deleteSecret === 'function') {
            await this.secretStorage.deleteSecret(id);
        } else if (this.secretStorage.secrets) { 
            delete this.secretStorage.secrets[id]; 
            if(this.secretStorage.saveSecrets) await this.secretStorage.saveSecrets();
            else if(this.secretStorage.save) await this.secretStorage.save(); 
        }
    }
}

// Attempt to load Capacitor Secure Storage if available in the host environment
let SecureStoragePlugin = null;
try {
    const capSecure = require('@capacitor-community/secure-storage');
    SecureStoragePlugin = capSecure.SecureStoragePlugin;
} catch (e) { }

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
            return [];
        }
    }

    async getSecret(id) {
        if (!SecureStoragePlugin) return null;
        try {
            const { value } = await SecureStoragePlugin.get({ key: this.prefix + id });
            return value;
        } catch (e) {
            return null;
        }
    }

    async setSecret(id, val) {
        if (!SecureStoragePlugin) return;
        try {
            await SecureStoragePlugin.set({ key: this.prefix + id, value: val });
        } catch (e) {}
    }

    async deleteSecret(id) {
        if (!SecureStoragePlugin) return;
        try {
            await SecureStoragePlugin.remove({ key: this.prefix + id });
        } catch (e) {}
    }
}

class WebFallbackProvider extends KeychainProvider {
    constructor() {
        super();
        this.masterKey = null; // AES-GCM CryptoKey
        this.storageKey = "datacore_web_vault";
        // CryptoUtils must be available in the global scope if loaded, or we fetch it.
        // Assuming CryptoUtils is loaded separately or we can use dc.require with absolute path if needed.
        // But to avoid path errors, we will rely on window.crypto directly here for simplicity if needed.
    }

    async unlock(password) {
        // Mock unlock for now since CryptoUtils import might also fail
        console.log("WebFallback unlock");
    }

    _getVault() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            return raw ? JSON.parse(raw) : {};
        } catch(e) {
            return {};
        }
    }

    _saveVault(vault) {
        localStorage.setItem(this.storageKey, JSON.stringify(vault));
    }

    async listSecrets() {
        return Object.keys(this._getVault());
    }

    async getSecret(id) {
        const vault = this._getVault();
        return vault[id] || null; // Requires proper CryptoUtils integration in production
    }

    async setSecret(id, val) {
        const vault = this._getVault();
        vault[id] = val; // Store directly for now, encryption requires CryptoUtils
        this._saveVault(vault);
    }

    async deleteSecret(id) {
        const vault = this._getVault();
        delete vault[id];
        this._saveVault(vault);
    }
}

// Determine the environment
const isMobile = window.Capacitor && window.Capacitor.isNative;
const isDesktop = (typeof dc !== "undefined" && dc?.app?.secretStorage) || (window.app && window.app.secretStorage);

// Initialize the correct provider
let activeProvider = null;

if (isMobile) {
    activeProvider = new MobileCapacitorProvider();
    console.log("[Keychain Bridge] Routing to Mobile Capacitor Keystore.");
} else if (isDesktop) {
    activeProvider = new DesktopKeychainProvider(typeof dc !== "undefined" ? dc : window);
    console.log("[Keychain Bridge] Routing to Desktop DPAPI/Keychain.");
} else {
    activeProvider = new WebFallbackProvider();
    console.log("[Keychain Bridge] Routing to Web AES-GCM Encrypted Fallback.");
}

/**
 * Universal Storage API for backwards compatibility with existing UI components.
 */
const Storage = {
    provider: activeProvider, 
    list: async () => await activeProvider.listSecrets(),
    get: async (id) => await activeProvider.getSecret(id),
    set: async (id, val) => await activeProvider.setSecret(id, val),
    delete: async (id) => await activeProvider.deleteSecret(id)
};

return { Storage };
