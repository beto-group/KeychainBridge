class y {
  async listSecrets() {
    throw new Error("Not implemented");
  }
  async getSecret(e) {
    throw new Error("Not implemented");
  }
  async setSecret(e, t) {
    throw new Error("Not implemented");
  }
  async deleteSecret(e) {
    throw new Error("Not implemented");
  }
}
class d extends y {
  constructor(e) {
    var t;
    super(), this.secretStorage = ((t = e == null ? void 0 : e.app) == null ? void 0 : t.secretStorage) || window.app && window.app.secretStorage;
  }
  async listSecrets() {
    return this.secretStorage ? typeof this.secretStorage.listSecrets == "function" ? await this.secretStorage.listSecrets() : Object.keys(this.secretStorage.secrets || {}) : [];
  }
  async getSecret(e) {
    var t;
    return this.secretStorage ? typeof this.secretStorage.getSecret == "function" ? await this.secretStorage.getSecret(e) : (t = this.secretStorage.secrets) == null ? void 0 : t[e] : null;
  }
  async setSecret(e, t) {
    this.secretStorage && (typeof this.secretStorage.setSecret == "function" ? await this.secretStorage.setSecret(e, t) : this.secretStorage.secrets && (this.secretStorage.secrets[e] = t, this.secretStorage.saveSecrets ? await this.secretStorage.saveSecrets() : this.secretStorage.save && await this.secretStorage.save()));
  }
  async deleteSecret(e) {
    this.secretStorage && (typeof this.secretStorage.deleteSecret == "function" ? await this.secretStorage.deleteSecret(e) : this.secretStorage.secrets && (delete this.secretStorage.secrets[e], this.secretStorage.saveSecrets ? await this.secretStorage.saveSecrets() : this.secretStorage.save && await this.secretStorage.save()));
  }
}
const h = typeof window < "u" && window.Capacitor && window.Capacitor.isNative;
class g extends y {
  constructor() {
    super(), this.prefix = "datacore_keychain_";
  }
  async _getPlugin() {
    if (h)
      try {
        return (await import("capacitor-secure-storage-plugin")).SecureStoragePlugin;
      } catch {
        return null;
      }
    return null;
  }
  async listSecrets() {
    const e = await this._getPlugin();
    if (!e) return [];
    try {
      const { keys: t } = await e.keys();
      return t.filter((r) => r.startsWith(this.prefix)).map((r) => r.replace(this.prefix, ""));
    } catch {
      return [];
    }
  }
  async getSecret(e) {
    const t = await this._getPlugin();
    if (!t) return null;
    try {
      const { value: r } = await t.get({ key: this.prefix + e });
      return r;
    } catch {
      return null;
    }
  }
  async setSecret(e, t) {
    const r = await this._getPlugin();
    if (r)
      try {
        await r.set({ key: this.prefix + e, value: t });
      } catch {
      }
  }
  async deleteSecret(e) {
    const t = await this._getPlugin();
    if (t)
      try {
        await t.remove({ key: this.prefix + e });
      } catch {
      }
  }
}
const l = {
  deriveKey: async (s, e) => {
    const t = new TextEncoder(), r = await window.crypto.subtle.importKey(
      "raw",
      t.encode(s),
      { name: "PBKDF2" },
      !1,
      ["deriveBits", "deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: e,
        iterations: 1e5,
        hash: "SHA-256"
      },
      r,
      { name: "AES-GCM", length: 256 },
      !0,
      ["encrypt", "decrypt"]
    );
  },
  encrypt: async (s, e) => {
    const t = window.crypto.getRandomValues(new Uint8Array(16)), r = window.crypto.getRandomValues(new Uint8Array(12)), i = await Crypto.deriveKey(e, t), o = new TextEncoder().encode(JSON.stringify(s)), n = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: r }, i, o), c = new Uint8Array(t.length + r.length + n.byteLength);
    return c.set(t, 0), c.set(r, t.length), c.set(new Uint8Array(n), t.length + r.length), btoa(String.fromCharCode.apply(null, c));
  },
  decrypt: async (s, e) => {
    try {
      const t = new Uint8Array(atob(s).split("").map((u) => u.charCodeAt(0))), r = t.slice(0, 16), i = t.slice(16, 28), o = t.slice(28), n = await Crypto.deriveKey(e, r), c = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: i }, n, o);
      return JSON.parse(new TextDecoder().decode(c));
    } catch {
      throw new Error("Incorrect Password.");
    }
  }
};
class S extends y {
  constructor() {
    super(), this.masterKey = null, this.storageKey = "datacore_web_vault";
  }
  async unlock(e) {
    this.masterKey = await l.deriveKey(e, "datacore_salt_static");
  }
  _getVault() {
    try {
      const e = localStorage.getItem(this.storageKey);
      return e ? JSON.parse(e) : {};
    } catch {
      return {};
    }
  }
  _saveVault(e) {
    localStorage.setItem(this.storageKey, JSON.stringify(e));
  }
  async listSecrets() {
    return Object.keys(this._getVault());
  }
  async getSecret(e) {
    if (!this.masterKey) throw new Error("Vault locked. Call unlock(password) first.");
    const t = this._getVault();
    if (!t[e]) return null;
    try {
      return await l.decryptString(t[e], this.masterKey);
    } catch {
      return console.error("[WebFallback] Decryption failed for secret:", e), null;
    }
  }
  async setSecret(e, t) {
    if (!this.masterKey) throw new Error("Vault locked. Call unlock(password) first.");
    const r = this._getVault();
    r[e] = await l.encryptString(t, this.masterKey), this._saveVault(r);
  }
  async deleteSecret(e) {
    const t = this._getVault();
    delete t[e], this._saveVault(t);
  }
}
const p = typeof window < "u" && window.Capacitor && window.Capacitor.isNative;
var w;
const f = typeof dc < "u" && ((w = dc == null ? void 0 : dc.app) == null ? void 0 : w.secretStorage);
let a = null;
p ? a = new g() : f ? a = new d(typeof dc < "u" ? dc : window) : a = new S();
const v = {
  provider: a,
  list: async () => await a.listSecrets(),
  get: async (s) => await a.getSecret(s),
  set: async (s, e) => await a.setSecret(s, e),
  delete: async (s) => await a.deleteSecret(s)
};
export {
  v as Storage
};
