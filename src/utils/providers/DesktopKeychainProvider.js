const { KeychainProvider } = dc.require("./providers/KeychainProvider.js");

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

return { DesktopKeychainProvider };
