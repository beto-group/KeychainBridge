const Storage = {
    list: async () => {
        const q = dc.app.secretStorage || (window.app && window.app.secretStorage);
        if (!q) return [];
        return (typeof q.listSecrets === 'function') ? await q.listSecrets() : Object.keys(q.secrets || {});
    },
    get: async (id) => {
        const q = dc.app.secretStorage || (window.app && window.app.secretStorage);
        return (typeof q.getSecret === 'function') ? await q.getSecret(id) : q.secrets?.[id];
    },
    set: async (id, val) => {
        const q = dc.app.secretStorage || (window.app && window.app.secretStorage);
        if (q && typeof q.setSecret === 'function') {
            await q.setSecret(id, val);
        } else if (q && q.secrets) { 
            q.secrets[id] = val; 
            if(q.saveSecrets) await q.saveSecrets();
            else if(q.save) await q.save(); 
        }
    },
    delete: async (id) => {
        const q = dc.app.secretStorage || (window.app && window.app.secretStorage);
        if (q && typeof q.deleteSecret === 'function') {
            await q.deleteSecret(id);
        } else if (q && q.secrets) { 
            delete q.secrets[id]; 
            if(q.saveSecrets) await q.saveSecrets();
            else if(q.save) await q.save(); 
        }
    }
};

return { Storage };
