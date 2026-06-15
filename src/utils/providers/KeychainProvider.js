/**
 * Base interface for the Universal Keychain Bridge
 */
export class KeychainProvider {
    /**
     * @returns {Promise<Array<string>>}
     */
    async listSecrets() {
        throw new Error("Method 'listSecrets()' must be implemented.");
    }

    /**
     * @param {string} id 
     * @returns {Promise<string>}
     */
    async getSecret(id) {
        throw new Error("Method 'getSecret()' must be implemented.");
    }

    /**
     * @param {string} id 
     * @param {string} val 
     * @returns {Promise<void>}
     */
    async setSecret(id, val) {
        throw new Error("Method 'setSecret()' must be implemented.");
    }

    /**
     * @param {string} id 
     * @returns {Promise<void>}
     */
    async deleteSecret(id) {
        throw new Error("Method 'deleteSecret()' must be implemented.");
    }
}
