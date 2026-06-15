import { KeychainProvider } from "./KeychainProvider.js";

// Determine if we are in a mobile environment with Capacitor
const isMobile = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNative;

export class MobileCapacitorProvider extends KeychainProvider {
    constructor() {
        super();
        this.prefix = "datacore_keychain_";
    }

    async _getPlugin() {
        // Only require the plugin if we are actually on mobile to avoid Vite bundling errors
        if (isMobile) {
            try {
                // We use dynamic import so Vite doesn't try to resolve it statically if not installed
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
