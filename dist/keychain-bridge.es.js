const C = {
  deriveKey: async (n, a) => {
    const r = new TextEncoder(), s = typeof a == "string" ? r.encode(a) : a, p = await window.crypto.subtle.importKey(
      "raw",
      r.encode(n),
      { name: "PBKDF2" },
      !1,
      ["deriveBits", "deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: s,
        iterations: 1e5,
        hash: "SHA-256"
      },
      p,
      { name: "AES-GCM", length: 256 },
      !0,
      ["encrypt", "decrypt"]
    );
  },
  encrypt: async (n, a) => {
    const r = window.crypto.getRandomValues(new Uint8Array(16)), s = window.crypto.getRandomValues(new Uint8Array(12)), p = await C.deriveKey(a, r), i = new TextEncoder().encode(JSON.stringify(n)), o = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: s }, p, i), x = new Uint8Array(r.length + s.length + o.byteLength);
    return x.set(r, 0), x.set(s, r.length), x.set(new Uint8Array(o), r.length + s.length), btoa(String.fromCharCode.apply(null, x));
  },
  decrypt: async (n, a) => {
    try {
      const r = new Uint8Array(atob(n).split("").map((d) => d.charCodeAt(0))), s = r.slice(0, 16), p = r.slice(16, 28), i = r.slice(28), o = await C.deriveKey(a, s), x = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: p }, o, i);
      return JSON.parse(new TextDecoder().decode(x));
    } catch {
      throw new Error("Incorrect Password.");
    }
  },
  // Used by WebFallbackProvider for encrypting localized strings using an already-derived key
  encryptString: async (n, a) => {
    const r = window.crypto.getRandomValues(new Uint8Array(12)), s = new TextEncoder(), p = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: r },
      a,
      s.encode(n)
    ), i = new Uint8Array(p), o = new Uint8Array(r.length + i.length);
    return o.set(r), o.set(i, r.length), btoa(String.fromCharCode.apply(null, o));
  },
  decryptString: async (n, a) => {
    const r = new Uint8Array(atob(n).split("").map((x) => x.charCodeAt(0))), s = r.slice(0, 12), p = r.slice(12), i = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: s },
      a,
      p
    );
    return new TextDecoder().decode(i);
  }
};
class De {
  constructor(a) {
    var r;
    this.secretStorage = ((r = a == null ? void 0 : a.app) == null ? void 0 : r.secretStorage) || window.app && window.app.secretStorage;
  }
  async listSecrets() {
    return this.secretStorage ? typeof this.secretStorage.listSecrets == "function" ? await this.secretStorage.listSecrets() : Object.keys(this.secretStorage.secrets || {}) : [];
  }
  async getSecret(a) {
    var r;
    return this.secretStorage ? typeof this.secretStorage.getSecret == "function" ? await this.secretStorage.getSecret(a) : (r = this.secretStorage.secrets) == null ? void 0 : r[a] : null;
  }
  async setSecret(a, r) {
    this.secretStorage && (typeof this.secretStorage.setSecret == "function" ? await this.secretStorage.setSecret(a, r) : this.secretStorage.secrets && (this.secretStorage.secrets[a] = r, this.secretStorage.saveSecrets ? await this.secretStorage.saveSecrets() : this.secretStorage.save && await this.secretStorage.save()));
  }
  async deleteSecret(a) {
    this.secretStorage && (typeof this.secretStorage.deleteSecret == "function" ? await this.secretStorage.deleteSecret(a) : this.secretStorage.secrets && (delete this.secretStorage.secrets[a], this.secretStorage.saveSecrets ? await this.secretStorage.saveSecrets() : this.secretStorage.save && await this.secretStorage.save()));
  }
}
const ye = typeof window < "u" && window.Capacitor && window.Capacitor.isNative;
class Pe {
  constructor() {
    this.prefix = "datacore_keychain_";
  }
  async _getPlugin() {
    if (ye)
      try {
        return (await import("capacitor-secure-storage-plugin")).SecureStoragePlugin;
      } catch {
        return null;
      }
    return null;
  }
  async listSecrets() {
    const a = await this._getPlugin();
    if (!a) return [];
    try {
      const { keys: r } = await a.keys();
      return r.filter((s) => s.startsWith(this.prefix)).map((s) => s.replace(this.prefix, ""));
    } catch {
      return [];
    }
  }
  async getSecret(a) {
    const r = await this._getPlugin();
    if (!r) return null;
    try {
      const { value: s } = await r.get({ key: this.prefix + a });
      return s;
    } catch {
      return null;
    }
  }
  async setSecret(a, r) {
    const s = await this._getPlugin();
    if (s)
      try {
        await s.set({ key: this.prefix + a, value: r });
      } catch {
      }
  }
  async deleteSecret(a) {
    const r = await this._getPlugin();
    if (r)
      try {
        await r.remove({ key: this.prefix + a });
      } catch {
      }
  }
}
class Me {
  constructor() {
    this.masterKey = null, this.storageKey = "datacore_web_vault";
  }
  async unlock(a) {
    this.masterKey = await C.deriveKey(a, "datacore_salt_static");
  }
  _getVault() {
    try {
      const a = localStorage.getItem(this.storageKey);
      return a ? JSON.parse(a) : {};
    } catch {
      return {};
    }
  }
  _saveVault(a) {
    localStorage.setItem(this.storageKey, JSON.stringify(a));
  }
  async listSecrets() {
    return Object.keys(this._getVault());
  }
  async getSecret(a) {
    if (!this.masterKey) throw new Error("Vault locked. Call unlock(password) first.");
    const r = this._getVault();
    if (!r[a]) return null;
    try {
      return await C.decryptString(r[a], this.masterKey);
    } catch {
      return console.error("[WebFallback] Decryption failed for secret:", a), null;
    }
  }
  async setSecret(a, r) {
    if (!this.masterKey) throw new Error("Vault locked. Call unlock(password) first.");
    const s = this._getVault();
    s[a] = await C.encryptString(r, this.masterKey), this._saveVault(s);
  }
  async deleteSecret(a) {
    const r = this._getVault();
    delete r[a], this._saveVault(r);
  }
}
var ue;
const Be = typeof dc < "u" && ((ue = dc == null ? void 0 : dc.app) == null ? void 0 : ue.secretStorage);
let K = null;
ye ? K = new Pe() : Be ? K = new De(typeof dc < "u" ? dc : window) : K = new Me();
const A = {
  provider: K,
  list: async () => await K.listSecrets(),
  get: async (n) => await K.getSecret(n),
  set: async (n, a) => await K.setSecret(n, a),
  delete: async (n) => await K.deleteSecret(n)
};
function Oe() {
  const n = {
    background: "var(--background-primary)",
    backgroundAlt: "var(--background-secondary)",
    backgroundAlt2: "var(--background-secondary-alt)",
    foreground: "var(--text-normal)",
    foregroundMuted: "var(--text-muted)",
    accent: "var(--text-normal)",
    accentDim: "rgba(255, 255, 255, 0.05)",
    accentBorder: "var(--border-color)",
    border: "var(--border-color)",
    red: "var(--text-error)",
    green: "var(--text-success)",
    blue: "var(--text-accent)"
  };
  return {
    theme: n,
    wrapper: {
      background: n.background,
      color: n.foreground,
      height: "100%",
      width: "100%",
      padding: "24px",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      boxSizing: "border-box"
    },
    title: {
      fontSize: "22px",
      fontWeight: "800",
      color: n.foreground,
      margin: "0 0 4px 0",
      letterSpacing: "-0.5px"
    },
    subtitle: {
      fontSize: "12px",
      color: n.foregroundMuted
    },
    headerData: {
      marginBottom: "20px",
      flexShrink: 0
    },
    badge: (r) => {
      let s = "var(--text-muted)", p = "var(--background-secondary-alt)", i = "var(--border-color)";
      return r === "SECURE MODE" || r === "READY" || r === "✓ SECURE" ? (s = "var(--text-success)", p = "rgba(var(--mono-rgb-100), 0.05)", i = "var(--text-success)") : (r === "LOCKED" || r === "API ERROR" || r === "SAVE FAILED" || r === "MIGRATION FAILED") && (s = "var(--text-error)", p = "rgba(var(--mono-rgb-100), 0.05)", i = "var(--text-error)"), {
        padding: "4px 10px",
        borderRadius: "12px",
        fontSize: "10px",
        fontWeight: "bold",
        textTransform: "uppercase",
        color: s,
        background: p,
        border: `1px solid ${i}`,
        opacity: 0.8,
        display: "inline-block"
      };
    },
    alert: {
      display: "flex",
      alignItems: "center",
      gap: "14px",
      padding: "12px 16px",
      borderRadius: "6px",
      border: `1px solid ${n.border}`,
      background: n.backgroundAlt,
      fontSize: "12px",
      color: n.foreground,
      marginBottom: "20px",
      flexShrink: 0
    },
    mainGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
      gap: "20px",
      flex: 1,
      minHeight: 0,
      overflow: "hidden"
    },
    glassCard: {
      background: n.backgroundAlt,
      border: `1px solid ${n.border}`,
      borderRadius: "8px",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      minHeight: 0,
      boxSizing: "border-box"
    },
    cardHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: `1px solid ${n.border}`,
      paddingBottom: "8px",
      flexShrink: 0
    },
    cardLabel: {
      fontSize: "11px",
      fontWeight: "700",
      color: n.foregroundMuted,
      textTransform: "uppercase",
      letterSpacing: "0.8px"
    },
    scroll: {
      flex: 1,
      overflowY: "auto",
      paddingRight: "6px"
    },
    listItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 12px",
      borderBottom: `1px solid ${n.border}`,
      borderRadius: "4px",
      transition: "background 0.2s",
      boxSizing: "border-box",
      marginBottom: "4px"
    },
    inputGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "12px"
    },
    inputLabel: {
      fontSize: "11px",
      fontWeight: "600",
      color: n.foregroundMuted,
      marginBottom: "4px",
      display: "block"
    },
    input: {
      width: "100%",
      background: n.backgroundAlt2,
      border: `1px solid ${n.border}`,
      padding: "10px 12px",
      color: n.foreground,
      borderRadius: "4px",
      fontSize: "13px",
      boxSizing: "border-box",
      outline: "none",
      transition: "border-color 0.2s"
    },
    buttonPrimary: (r) => ({
      backgroundColor: r ? "var(--background-secondary)" : "var(--background-secondary-alt)",
      color: r ? "var(--text-muted)" : "var(--text-normal)",
      border: "1px solid var(--border-color)",
      padding: "10px 16px",
      fontWeight: "500",
      borderRadius: "6px",
      cursor: r ? "not-allowed" : "pointer",
      fontSize: "13px",
      width: "100%",
      transition: "all 0.2s",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
    }),
    buttonSecondary: {
      background: "var(--background-secondary-alt)",
      border: "1px solid var(--border-color)",
      color: "var(--text-normal)",
      padding: "10px 16px",
      fontWeight: "500",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "13px",
      width: "100%",
      boxSizing: "border-box",
      transition: "all 0.2s"
    },
    iconButton: {
      background: "none",
      border: "none",
      color: n.foregroundMuted,
      cursor: "pointer",
      padding: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: 0.7,
      transition: "opacity 0.2s"
    },
    resultPanel: {
      padding: "12px",
      background: n.backgroundAlt2,
      borderRadius: "4px",
      border: `1px solid ${n.border}`,
      maxHeight: "120px",
      overflowY: "auto"
    },
    resultCode: {
      fontFamily: "monospace",
      fontSize: "12px",
      color: n.green,
      wordBreak: "break-all",
      userSelect: "all"
    },
    tabBtn: (r) => ({
      flex: 1,
      padding: "8px",
      fontSize: "11px",
      fontWeight: "600",
      border: `1px solid ${r ? "var(--border-color)" : "transparent"}`,
      background: r ? "var(--background-primary)" : "transparent",
      color: r ? "var(--text-normal)" : "var(--text-muted)",
      borderRadius: "4px",
      cursor: "pointer",
      transition: "all 0.2s"
    }),
    leakBox: {
      background: "rgba(239, 68, 68, 0.08)",
      border: "1px solid rgba(239, 68, 68, 0.25)",
      padding: "12px 16px",
      borderRadius: "6px",
      marginBottom: "15px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexShrink: 0
    },
    globalCss: `
            .screen-mode-placeholder {
                display: none !important;
            }
            .keychain-bridge-log-item {
                font-size: 11px;
                padding-bottom: 6px;
                margin-bottom: 6px;
                border-bottom: 1px dashed var(--border-color);
            }
            .tooltip-container {
                position: relative;
                display: inline-flex;
                align-items: center;
                cursor: pointer;
            }
            .tooltip-text {
                visibility: hidden;
                width: 220px;
                background-color: var(--background-secondary-alt);
                color: var(--text-normal);
                text-align: left;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                padding: 8px 12px;
                position: absolute;
                z-index: 9999;
                bottom: 125%;
                left: 50%;
                transform: translateX(-50%);
                opacity: 0;
                transition: opacity 0.25s, visibility 0.25s;
                font-size: 11px;
                font-weight: normal;
                line-height: 1.4;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                pointer-events: none;
                white-space: normal;
            }
            .tooltip-container:hover .tooltip-text {
                visibility: visible;
                opacity: 1;
            }
            
            /* Custom minimalist action button styling */
            .keychain-bridge-action-btn {
                color: var(--text-muted) !important;
                opacity: 0.6;
                transition: color 0.2s, opacity 0.2s;
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                display: flex;
                alignItems: center;
                justifyContent: center;
            }
            .keychain-bridge-action-btn:hover {
                color: var(--text-normal) !important;
                opacity: 1 !important;
            }

            .keychain-bridge-delete-btn {
                color: var(--text-muted) !important;
                opacity: 0.6;
                transition: color 0.2s, opacity 0.2s;
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                display: flex;
                alignItems: center;
                justifyContent: center;
            }
            .keychain-bridge-delete-btn:hover {
                color: var(--text-error) !important;
                opacity: 1 !important;
            }
        `
  };
}
function ze({ onReload: n, onToggle: a, styles: r, isFullTab: s }) {
  const p = r.theme, i = {
    group: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      background: "var(--background-secondary)",
      border: "1px solid var(--border-color)",
      padding: "4px 8px",
      borderRadius: "6px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
    },
    button: {
      background: "none",
      border: "none",
      color: "var(--text-muted)",
      cursor: "pointer",
      padding: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "4px",
      transition: "all 0.2s"
    }
  };
  return h(
    "div",
    { style: i.group },
    h(
      "button",
      {
        style: i.button,
        onClick: n,
        title: "Reload Code",
        onMouseOver: (o) => {
          o.currentTarget.style.color = p.accent, o.currentTarget.style.background = "rgba(255,255,255,0.05)";
        },
        onMouseOut: (o) => {
          o.currentTarget.style.color = "var(--text-muted)", o.currentTarget.style.background = "none";
        }
      },
      h(dc.Icon, { icon: "rotate-cw", style: { width: "14px", height: "14px" } })
    ),
    h(
      "button",
      {
        style: i.button,
        onClick: a,
        title: s ? "Collapse to Compact" : "Expand to Full Tab",
        onMouseOver: (o) => {
          o.currentTarget.style.color = p.accent, o.currentTarget.style.background = "rgba(255,255,255,0.05)";
        },
        onMouseOut: (o) => {
          o.currentTarget.style.color = "var(--text-muted)", o.currentTarget.style.background = "none";
        }
      },
      h(dc.Icon, { icon: s ? "minimize-2" : "maximize-2", style: { width: "14px", height: "14px" } })
    )
  );
}
const { useState: g, useEffect: pe, useRef: Ne } = dc, { h: t, Fragment: $e } = dc.preact;
function Ue({ folderPath: n, onCodeReloadRequest: a, isFullTab: r, onToggleFullTab: s }) {
  const p = Oe(), i = p.theme, o = p, x = n + "/data", d = {
    canary: x + "/handshake.enc",
    backup: x + "/vault-secrets.bak.enc",
    history: x + "/bridge-history.json",
    archives: x + "/archives"
  }, [m, O] = g("LOADING"), [w, ge] = g(""), [H, fe] = g(""), [ee, D] = g(null), [S, v] = g(!1), [V, te] = g(null), [Y, z] = g("Initializing Native API..."), [M, he] = g([]), [k, $] = g({}), [f, B] = g(null), [T, xe] = g([]), [F, be] = g([]), [re, ae] = g(null), [me, U] = g([]), [N, oe] = g(""), [_, ne] = g(""), [P, se] = g("SYSTEM"), u = async (e, c = "info") => {
    const l = { msg: e, type: c, time: (/* @__PURE__ */ new Date()).toISOString() };
    try {
      const b = dc.app.vault.adapter;
      let y = [];
      if (await b.exists(d.history))
        try {
          y = JSON.parse(await b.read(d.history));
        } catch {
        }
      y.unshift(l), await b.write(d.history, JSON.stringify(y.slice(0, 200), null, 2)), U(y);
    } catch {
      U((y) => [l, ...y]);
    }
  }, we = async () => {
    try {
      const e = dc.app.vault.adapter;
      if (await e.exists(d.history)) {
        const c = await e.read(d.history);
        U(JSON.parse(c));
      }
    } catch {
      U([]);
    }
  }, I = async () => {
    const e = await A.list();
    he(e);
  }, j = () => {
    const e = ["token", "key", "secret", "password", "auth", "cred", "api"], c = ["antigravity_debug_config", "antigravity_usage_stats_v1", "antigravity_accounts_v2", "handshake.enc"], l = [];
    for (let b = 0; b < localStorage.length; b++) {
      const y = localStorage.key(b);
      if (y && !c.includes(y) && e.some((E) => y.toLowerCase().includes(E))) {
        const E = localStorage.getItem(y);
        E && E.length < 1e3 && l.push(y);
      }
    }
    xe(l);
  }, J = async () => {
    const e = dc.app.vault.adapter;
    if (!await e.exists(d.archives))
      return await e.mkdir(d.archives), [];
    const l = ((await e.list(d.archives)).files || []).filter((b) => b.includes("bak.")).sort().reverse();
    return be(l), l;
  }, ie = async (e, c = d.backup) => {
    try {
      const l = dc.app.vault.adapter;
      if (await l.exists(c)) {
        const b = await l.read(c), y = await C.decrypt(b, e);
        $(y), ae(c.split("/").pop());
      } else
        $({});
    } catch {
      $({});
    }
  }, Se = async () => {
    try {
      const e = dc.app.vault.adapter;
      await e.exists(x) || await e.mkdir(x), await e.exists(d.archives) || await e.mkdir(d.archives), await e.exists(d.canary) ? (O("LOCKED"), z("LOCKED")) : (O("SETUP"), z("SETUP REQUIRED")), await we(), await I(), j();
    } catch {
      O("SETUP"), z("SETUP REQUIRED");
    }
  };
  pe(() => {
    Se();
  }, []), pe(() => {
    if (m !== "READY") return;
    const e = setInterval(() => {
      I(), j();
    }, 4e3);
    return () => clearInterval(e);
  }, [m]);
  const Q = async () => {
    if (w) {
      if (w !== H)
        return D("Passwords do not match.");
      v(!0), D(null);
      try {
        const e = { verifier: "BETO_IDENTITY_VERIFIED", created: Date.now() }, c = await C.encrypt(e, w);
        await dc.app.vault.adapter.write(d.canary, c), te(w), O("READY"), z("SECURE MODE"), await I(), await u("Master Identity Secured and Keychain Bridge Initialized.", "success");
      } catch (e) {
        D(e.message), await u("Bridge Setup Failed: " + e.message, "error");
      } finally {
        v(!1);
      }
    }
  }, ce = async () => {
    if (w) {
      v(!0), D(null);
      try {
        const e = await dc.app.vault.adapter.read(d.canary);
        await C.decrypt(e, w), te(w), O("READY"), z("SECURE MODE"), await I(), await ie(w), await J(), await u("Vault key decrypted successfully. Access granted.", "success");
      } catch {
        D("Incorrect master passphrase."), await u("Failed unlock attempt.", "error");
      } finally {
        v(!1);
      }
    }
  }, ve = async () => {
    if (!(!N || !_)) {
      v(!0);
      try {
        const e = N.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 64);
        await A.set(e, _), await u(`Stored secret "${e}" in system keychain.`, "success"), oe(""), ne(""), await I();
      } catch (e) {
        await u(`Failed storing secret: ${e.message}`, "error");
      } finally {
        v(!1);
      }
    }
  }, ke = async (e) => {
    B({ id: e, loading: !0 });
    try {
      const c = await A.get(e);
      B({ id: e, value: c, loading: !1 });
    } catch (c) {
      B({ id: e, error: c.message, loading: !1 });
    }
  }, Ee = async () => {
    if (!V) return;
    v(!0), await u("Creating encrypted credential snapshot...", "info");
    const e = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"), [c, l] = e.split("T"), b = c.replace(/-/g, "") + "_" + l.split("-").slice(0, 2).join("");
    try {
      const y = await A.list(), E = { ...k };
      let X = 0;
      for (const R of y) {
        const de = await A.get(R), Z = k[R];
        if (Z !== void 0 && Z !== de) {
          const Ke = `${R} [V_${b}]`;
          E[Ke] = Z, X++;
        }
        E[R] = de;
      }
      const le = await C.encrypt(E, V);
      await dc.app.vault.adapter.write(d.backup, le);
      const Re = `${d.archives}/bak.${e}.enc`;
      await dc.app.vault.adapter.write(Re, le);
      const G = await J();
      if (G && G.length > 10) {
        for (let R = 10; R < G.length; R++)
          await dc.app.vault.adapter.remove(G[R]);
        await J();
      }
      $(E), ae(`bak.${e}.enc`), await u(`Backup complete. Stored ${Object.keys(E).length} keys. ${X ? `(${X} versions archived)` : "Clean Sync."}`, "success"), await I();
    } catch (y) {
      await u(`Backup failed: ${y.message}`, "error");
    } finally {
      v(!1);
    }
  }, Ce = async () => {
    v(!0), await u("Omni-redeploying secrets to OS Keychain...", "info");
    try {
      const e = Object.keys(k);
      let c = 0;
      for (const l of e) {
        if (l.includes("[V_")) continue;
        await A.get(l) !== k[l] && (await A.set(l, k[l]), c++);
      }
      await u(`Omni-Restore completed. Recovered/updated ${c} secrets.`, "success"), await I();
    } catch (e) {
      await u(`Restore failed: ${e.message}`, "error");
    } finally {
      v(!1);
    }
  }, Ie = async (e) => {
    if (confirm(`Permanently purge "${e}" from your computer's keychain?`))
      try {
        await A.delete(e), await u(`Purged system key "${e}".`, "success"), await I(), (f == null ? void 0 : f.id) === e && B(null);
      } catch (c) {
        await u(`Purge failed: ${c.message}`, "error");
      }
  }, Ae = async (e) => {
    if (confirm(`Remove "${e}" from backup? (Requires saving backup file)`))
      try {
        const c = { ...k };
        delete c[e];
        const l = await C.encrypt(c, V);
        await dc.app.vault.adapter.write(d.backup, l), $(c), await u(`Erased "${e}" from backup snapshot.`, "success");
      } catch (c) {
        await u(`Backup edit failed: ${c.message}`, "error");
      }
  }, Te = async () => {
    if (confirm(`Secure and migrate all ${T.length} discovered keys into OS Keychain?`)) {
      v(!0);
      try {
        for (const e of T) {
          const c = localStorage.getItem(e), l = e.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 64);
          await A.set(l, c), localStorage.removeItem(e);
        }
        await u(`Migrated ${T.length} credentials from plain-text localStorage.`, "success"), j(), await I();
      } catch (e) {
        await u(`Migration failed: ${e.message}`, "error");
      } finally {
        v(!1);
      }
    }
  }, L = (e) => t(
    "span",
    {
      style: { marginLeft: "6px", verticalAlign: "middle", display: "inline-flex", opacity: 0.6, cursor: "help" },
      title: e
    },
    t(dc.Icon, { icon: "help-circle", style: { width: "13px", height: "13px" } })
  );
  if (!r)
    return t(
      "div",
      { style: o.compactWrapper, onClick: s },
      t(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "12px" } },
        t(dc.Icon, { icon: "shield", style: { width: 18, color: T.length > 0 ? "#f87171" : "#4ade80" } }),
        t(dc.Icon, { icon: "key", style: { width: 18, color: "#4ade80" } }),
        t("span", { style: o.compactText }, `Keychain Bridge • ${M.length} Keys ${T.length > 0 ? `(+${T.length} Leaks)` : ""}`)
      ),
      t("div", { style: o.badge(Y) }, Y)
    );
  const W = w && w === H, q = !!w;
  return t(
    "div",
    { style: o.wrapper },
    t("style", null, o.globalCss),
    // Upper-Right controls
    t(
      "div",
      { style: { position: "absolute", top: "24px", right: "24px", zIndex: 100 } },
      t(ze, { onReload: a, onToggle: s, styles: o, isFullTab: r })
    ),
    t(
      "div",
      { style: o.headerData },
      t("h1", { style: o.title }, "KEYCHAIN BRIDGE"),
      t(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "16px", marginTop: "6px" } },
        t("div", { style: o.subtitle }, "Unified Local OS Keyring & Encrypted backups"),
        t("div", { style: o.badge(Y) }, Y)
      )
    ),
    // Locked / Setup Handshake Screen
    (m === "LOCKED" || m === "SETUP") && t(
      "div",
      { style: { display: "flex", flex: 1, alignItems: "center", justifyContent: "center" } },
      t(
        "div",
        { style: { ...o.glassCard, width: "400px", padding: "24px", gap: "16px", flex: "none", justifyContent: "center" } },
        t(
          "h3",
          { style: { margin: 0, textAlign: "center", color: "#fff", fontSize: "15px", fontWeight: "bold" } },
          m === "SETUP" ? "KEYRING BRIDGE CONFIGURATION" : "ENTER MASTER PASSPHRASE"
        ),
        t(
          "p",
          { style: { margin: 0, fontSize: "11px", color: i.foregroundMuted, textAlign: "center", lineHeight: "1.4" } },
          m === "SETUP" ? "Set a master password to encrypt your credential backups in your local vault. We do not store this password." : "Enter your master passphrase to unlock the local secure credential bridge and load backups."
        ),
        t(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "10px" } },
          t("input", {
            style: o.input,
            type: "password",
            placeholder: "Master Passphrase",
            value: w,
            onChange: (e) => {
              ge(e.target.value), D(null);
            },
            onKeyDown: (e) => {
              e.key === "Enter" && !S && (m === "SETUP" ? W && Q() : q && ce());
            },
            autoFocus: !0
          }),
          m === "SETUP" && t("input", {
            style: o.input,
            type: "password",
            placeholder: "Confirm Passphrase",
            value: H,
            onChange: (e) => {
              fe(e.target.value), D(null);
            },
            onKeyDown: (e) => {
              e.key === "Enter" && W && !S && Q();
            }
          })
        ),
        ee && t("div", { style: { color: "#f87171", fontSize: "11px", textAlign: "center", fontWeight: "bold" } }, ee),
        t("button", {
          style: o.buttonPrimary(m === "SETUP" ? !W || S : !q || S),
          disabled: m === "SETUP" ? !W || S : !q || S,
          onClick: m === "SETUP" ? Q : ce
        }, S ? "Decrypting..." : m === "SETUP" ? "INITIALIZE KEYCHAIN BRIDGE" : "UNLOCK KEYCHAIN BRIDGE")
      )
    ),
    // Authenticated Worksheets
    m === "READY" && t(
      $e,
      null,
      // Security Leaks Banner
      T.length > 0 && t(
        "div",
        { style: o.leakBox },
        t(
          "div",
          null,
          t(
            "div",
            { style: { color: "#f87171", fontWeight: "bold", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" } },
            t(dc.Icon, { icon: "alert-triangle", style: { width: 14 } }),
            "SECURITY LEAK DETECTED"
          ),
          t(
            "div",
            { style: { fontSize: "11px", color: i.foregroundMuted, marginTop: "2px" } },
            `${T.length} sensitive item(s) found in plain-text storage. A single click will move them to your OS keychain.`
          )
        ),
        t("button", { style: { ...o.buttonSecondary, background: "#f87171", color: "#fff", border: "none", fontWeight: "600" }, onClick: Te }, "MIGRATE ALL TO KEYCHAIN")
      ),
      // Main Columns Grid
      t(
        "div",
        { style: o.mainGrid },
        // Column 1: Config and Registration
        t(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "20px", minHeight: 0 } },
          t(
            "div",
            { style: o.glassCard },
            t(
              "div",
              { style: o.cardHeader },
              t(
                "span",
                { style: o.cardLabel },
                "Backup & Restore",
                L("Operations to sync your credentials between this computer and your local vault backup.")
              )
            ),
            t("button", { style: o.buttonPrimary(S), disabled: S, onClick: Ee }, "Export Computer Keys to Backup (.enc)"),
            t("button", {
              style: { ...o.buttonSecondary, marginTop: "4px", width: "100%", padding: "10px" },
              disabled: S || Object.keys(k).length === 0,
              onClick: Ce
            }, "Import Backup (.enc) to Computer"),
            t(
              "div",
              { style: { borderTop: `1px solid ${i.border}`, paddingTop: "12px", marginTop: "10px" } },
              t(
                "div",
                { style: { color: i.foregroundMuted, fontSize: "10px", fontWeight: "bold", marginBottom: "8px" } },
                "ADD KEY TO COMPUTER",
                L("Saves a new secret credential directly to your computer's secure OS keychain.")
              ),
              t(
                "div",
                { style: o.inputGroup },
                t("input", {
                  style: o.input,
                  placeholder: "Identifier / Name (e.g. openai-key)",
                  value: N,
                  onChange: (e) => oe(e.target.value)
                }),
                t("input", {
                  style: o.input,
                  type: "password",
                  placeholder: "Secret Value (Token/Password)",
                  value: _,
                  onChange: (e) => ne(e.target.value)
                }),
                t("button", {
                  style: o.buttonPrimary(!N || !_ || S),
                  disabled: !N || !_ || S,
                  onClick: ve
                }, "Save Secret to Computer")
              )
            )
          )
        ),
        // Column 2: Computer Keys & Backup Snapshot Explorer
        t(
          "div",
          { style: o.glassCard },
          t(
            "div",
            { style: { display: "flex", gap: "5px", padding: "4px", background: i.backgroundAlt2, borderRadius: "6px", flexShrink: 0 } },
            t(
              "button",
              { style: o.tabBtn(P === "SYSTEM"), onClick: () => se("SYSTEM") },
              "ON COMPUTER",
              L("Credentials currently stored securely in your OS Keychain.")
            ),
            t(
              "button",
              { style: o.tabBtn(P === "BACKUP"), onClick: () => se("BACKUP") },
              "IN BACKUP FILE",
              L("Credentials stored in your encrypted backup snapshot file.")
            )
          ),
          P === "BACKUP" && F.length > 0 && t(
            "div",
            { style: { padding: "8px 10px", background: i.backgroundAlt2, borderRadius: "4px", display: "flex", gap: "10px", alignItems: "center", flexShrink: 0 } },
            t("span", { style: { fontSize: "9px", opacity: 0.6, fontWeight: "bold" } }, "SNAPSHOTS:"),
            t(
              "select",
              {
                style: { background: i.backgroundAlt, color: i.accent, border: `1px solid ${i.border}`, fontSize: "10px", flex: 1, padding: "4px" },
                value: re === "vault-secrets.bak.enc" ? F[0] : re,
                onChange: (e) => ie(V, e.target.value.includes("/") ? e.target.value : `${d.archives}/${e.target.value}`)
              },
              F.map(
                (e) => t("option", { key: e, value: e }, e.split("bak.").pop().replace(".enc", "").replace(/-/g, ":"))
              )
            )
          ),
          t(
            "div",
            { style: o.scroll },
            (P === "SYSTEM" ? M : Object.keys(k)).map(
              (e) => t(
                "div",
                { key: e, style: o.listItem },
                t(
                  "div",
                  { style: { display: "flex", flexDirection: "column", gap: "2px", flex: 1, minWidth: 0 } },
                  t("span", { style: { fontWeight: "600", fontSize: "13px", color: "#fff", wordBreak: "break-all" } }, e),
                  (f == null ? void 0 : f.id) === e && t(
                    "div",
                    { style: o.resultPanel },
                    f.loading ? t("span", { style: { fontSize: "11px", color: i.foregroundMuted } }, "Decrypting...") : f.error ? t("span", { style: { fontSize: "11px", color: i.red } }, `Error: ${f.error}`) : t("div", { style: o.resultCode }, f.value)
                  )
                ),
                t(
                  "div",
                  { style: { display: "flex", gap: "8px", flexShrink: 0 } },
                  t(
                    "button",
                    {
                      className: "keychain-bridge-action-btn",
                      onClick: () => {
                        (f == null ? void 0 : f.id) === e ? B(null) : P === "SYSTEM" ? ke(e) : B({ id: e, value: k[e], loading: !1 });
                      }
                    },
                    t(dc.Icon, { icon: (f == null ? void 0 : f.id) === e ? "eye-off" : "eye", style: { width: 14 } })
                  ),
                  t(
                    "button",
                    {
                      className: "keychain-bridge-delete-btn",
                      onClick: () => P === "SYSTEM" ? Ie(e) : Ae(e)
                    },
                    t(dc.Icon, { icon: "trash-2", style: { width: 14 } })
                  )
                )
              )
            ),
            (P === "SYSTEM" ? M : Object.keys(k)).length === 0 && t(
              "div",
              { style: { padding: "40px", textAlign: "center", color: i.foregroundMuted, fontSize: "12px" } },
              "No keys found in this section."
            )
          )
        ),
        // Column 3: History log and audit
        t(
          "div",
          { style: o.glassCard },
          t(
            "div",
            { style: o.cardHeader },
            t(
              "span",
              { style: o.cardLabel },
              "Bridge Activity Log",
              L("Audited trail of keychain actions, unlocks, backups, and restores.")
            ),
            t("button", {
              style: { background: "none", border: "none", color: i.foregroundMuted, cursor: "pointer", fontSize: "9px" },
              onClick: () => {
                U([]);
                try {
                  dc.app.vault.adapter.remove(d.history);
                } catch {
                }
              }
            }, "CLEAR")
          ),
          t(
            "div",
            { style: o.scroll },
            me.map(
              (e, c) => t(
                "div",
                { key: c, className: "keychain-bridge-log-item" },
                t("div", { style: { opacity: 0.4, fontSize: "8px", color: i.foregroundMuted } }, new Date(e.time).toLocaleString()),
                t("div", { style: { color: e.type === "success" ? i.green : e.type === "error" ? i.red : i.foreground, fontSize: "11px", marginTop: "2px" } }, e.msg)
              )
            )
          ),
          t(
            "div",
            { style: { marginTop: "auto", padding: "12px", background: i.backgroundAlt2, borderRadius: "6px", border: `1px solid ${i.border}`, flexShrink: 0 } },
            t("div", { style: { fontSize: "13px", fontWeight: "bold", color: "#fff" } }, `${M.length} System Keys`),
            t(
              "div",
              { style: { fontSize: "11px", color: Object.keys(k).filter((e) => !M.includes(e)).length > 0 ? i.red : i.green, marginTop: "2px" } },
              Object.keys(k).filter((e) => !M.includes(e)).length > 0 ? "Sync Mismatch: Keys pending backup" : "✓ Secure System Sync"
            )
          )
        )
      )
    )
  );
}
function _e(n, a) {
  window.React || (window.React = a.preact), window.ReactDOM || (window.ReactDOM = a.preact);
  const { h: r, render: s } = a.preact;
  return s(r(Ue, {
    folderPath: "KEYCHAIN BRIDGE",
    isFullTab: !0,
    dc: a
  }), n), () => {
    s(null, n);
  };
}
export {
  _e as mount_app
};
