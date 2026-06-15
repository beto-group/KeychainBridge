const l = {
  deriveKey: async (s, e) => {
    const t = new TextEncoder(), r = typeof e == "string" ? t.encode(e) : e, a = await window.crypto.subtle.importKey(
      "raw",
      t.encode(s),
      { name: "PBKDF2" },
      !1,
      ["deriveBits", "deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: r,
        iterations: 1e5,
        hash: "SHA-256"
      },
      a,
      { name: "AES-GCM", length: 256 },
      !0,
      ["encrypt", "decrypt"]
    );
  },
  encrypt: async (s, e) => {
    const t = window.crypto.getRandomValues(new Uint8Array(16)), r = window.crypto.getRandomValues(new Uint8Array(12)), a = await l.deriveKey(e, t), n = new TextEncoder().encode(JSON.stringify(s)), c = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: r }, a, n), i = new Uint8Array(t.length + r.length + c.byteLength);
    return i.set(t, 0), i.set(r, t.length), i.set(new Uint8Array(c), t.length + r.length), btoa(String.fromCharCode.apply(null, i));
  },
  decrypt: async (s, e) => {
    try {
      const t = new Uint8Array(atob(s).split("").map((w) => w.charCodeAt(0))), r = t.slice(0, 16), a = t.slice(16, 28), n = t.slice(28), c = await l.deriveKey(e, r), i = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: a }, c, n);
      return JSON.parse(new TextDecoder().decode(i));
    } catch {
      throw new Error("Incorrect Password.");
    }
  },
  // Used by WebFallbackProvider for encrypting localized strings using an already-derived key
  encryptString: async (s, e) => {
    const t = window.crypto.getRandomValues(new Uint8Array(12)), r = new TextEncoder(), a = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: t },
      e,
      r.encode(s)
    ), n = new Uint8Array(a), c = new Uint8Array(t.length + n.length);
    return c.set(t), c.set(n, t.length), btoa(String.fromCharCode.apply(null, c));
  },
  decryptString: async (s, e) => {
    const t = new Uint8Array(atob(s).split("").map((i) => i.charCodeAt(0))), r = t.slice(0, 12), a = t.slice(12), n = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: r },
      e,
      a
    );
    return new TextDecoder().decode(n);
  }
};
class d {
  constructor(e) {
    var t;
    this.secretStorage = ((t = e == null ? void 0 : e.app) == null ? void 0 : t.secretStorage) || window.app && window.app.secretStorage;
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
const u = typeof window < "u" && window.Capacitor && window.Capacitor.isNative;
class g {
  constructor() {
    this.prefix = "datacore_keychain_";
  }
  async _getPlugin() {
    if (u)
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
class h {
  constructor() {
    this.masterKey = null, this.storageKey = "datacore_web_vault";
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
var y;
const S = typeof dc < "u" && ((y = dc == null ? void 0 : dc.app) == null ? void 0 : y.secretStorage);
let o = null;
u ? o = new g() : S ? o = new d(typeof dc < "u" ? dc : window) : o = new h();
const p = {
  provider: o,
  list: async () => await o.listSecrets(),
  get: async (s) => await o.getSecret(s),
  set: async (s, e) => await o.setSecret(s, e),
  delete: async (s) => await o.deleteSecret(s)
};
export {
  p as Storage
};
