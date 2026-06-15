import { KeychainProvider } from "./KeychainProvider.js";
import { CryptoUtils } from "../CryptoUtils.js";

/**
 * WebFallbackProvider uses WebCrypto API to encrypt secrets and stores them in localStorage.
 * Requires a user-provided Master Password to unlock the vault.
 */
export class WebFallbackProvider extends KeychainProvider {
    constructor() {
        super();
        this.masterKey = null; // AES-GCM CryptoKey
        this.storageKey = "datacore_web_vault";
    }

    // Must be called to unlock the vault before get/set
    async unlock(password) {
        // Derive a 256-bit AES-GCM key from the password using PBKDF2
        this.masterKey = await CryptoUtils.deriveKey(password, "datacore_salt_static");
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

        // Decrypt the stored AES-GCM payload
        try {
            return await CryptoUtils.decryptString(vault[id], this.masterKey);
        } catch (e) {
            console.error("[WebFallback] Decryption failed for secret:", id);
            return null;
        }
    }

    async setSecret(id, val) {
        if (!this.masterKey) throw new Error("Vault locked. Call unlock(password) first.");
        const vault = this._getVault();
        
        // Encrypt the plain text string into an AES-GCM payload
        vault[id] = await CryptoUtils.encryptString(val, this.masterKey);
        this._saveVault(vault);
    }

    async deleteSecret(id) {
        const vault = this._getVault();
        delete vault[id];
        this._saveVault(vault);
    }
}
