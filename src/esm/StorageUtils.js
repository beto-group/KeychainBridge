import { Crypto } from "./CryptoUtils.js";

// --- Providers Inline ---

class DesktopKeychainProvider {
    constructor(dcObj) {
        this.secretStorage = dcObj?.app?.secretStorage || (window.app && window.app.secretStorage);
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

const isMobile = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNative;

class MobileCapacitorProvider {
    constructor() {
        this.prefix = "datacore_keychain_";
    }

    async _getPlugin() {
        if (isMobile) {
            try {
                const capSecure = await import('capacitor-secure-storage-plugin');
                return capSecure.SecureStoragePlugin;
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    async listSecrets() {
        const plugin = await this._getPlugin();
        if (!plugin) return [];
        try {
            const { keys } = await plugin.keys();
            return keys.filter(k => k.startsWith(this.prefix)).map(k => k.replace(this.prefix, ''));
        } catch (e) {
            return [];
        }
    }

    async getSecret(id) {
        const plugin = await this._getPlugin();
        if (!plugin) return null;
        try {
            const { value } = await plugin.get({ key: this.prefix + id });
            return value;
        } catch (e) {
            return null;
        }
    }

    async setSecret(id, val) {
        const plugin = await this._getPlugin();
        if (!plugin) return;
        try {
            await plugin.set({ key: this.prefix + id, value: val });
        } catch (e) {}
    }

    async deleteSecret(id) {
        const plugin = await this._getPlugin();
        if (!plugin) return;
        try {
            await plugin.remove({ key: this.prefix + id });
        } catch (e) {}
    }
}

class WebFallbackProvider {
    constructor() {
        this.masterKey = null; 
        this.storageKey = "datacore_web_vault";
    }

    async unlock(password) {
        this.masterKey = await Crypto.deriveKey(password, "datacore_salt_static");
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
        if (!this.masterKey) throw new Error("Vault locked. Call unlock(password) first.");
        const vault = this._getVault();
        if (!vault[id]) return null;
        try {
            return await Crypto.decryptString(vault[id], this.masterKey);
        } catch (e) {
            console.error("[WebFallback] Decryption failed for secret:", id);
            return null;
        }
    }

    async setSecret(id, val) {
        if (!this.masterKey) throw new Error("Vault locked. Call unlock(password) first.");
        const vault = this._getVault();
        vault[id] = await Crypto.encryptString(val, this.masterKey);
        this._saveVault(vault);
    }

    async deleteSecret(id) {
        const vault = this._getVault();
        delete vault[id];
        this._saveVault(vault);
    }
}

// --- Router Engine ---

const isDesktop = typeof dc !== "undefined" && dc?.app?.secretStorage;

let activeProvider = null;
if (isMobile) {
    activeProvider = new MobileCapacitorProvider();
} else if (isDesktop) {
    activeProvider = new DesktopKeychainProvider(typeof dc !== "undefined" ? dc : window);
} else {
    activeProvider = new WebFallbackProvider();
}

const Storage = {
    provider: activeProvider, 
    list: async () => await activeProvider.listSecrets(),
    get: async (id) => await activeProvider.getSecret(id),
    set: async (id, val) => await activeProvider.setSecret(id, val),
    delete: async (id) => await activeProvider.deleteSecret(id)
};

export { Storage  };