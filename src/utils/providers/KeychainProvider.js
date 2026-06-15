/**
 * Base interface for the Universal Keychain Bridge
 */
class KeychainProvider {
    async listSecrets() {
        throw new Error("Method 'listSecrets()' must be implemented.");
    }

    async getSecret(id) {
        throw new Error("Method 'getSecret()' must be implemented.");
    }

    async setSecret(id, val) {
        throw new Error("Method 'setSecret()' must be implemented.");
    }

    async deleteSecret(id) {
        throw new Error("Method 'deleteSecret()' must be implemented.");
    }
}

return { KeychainProvider };
