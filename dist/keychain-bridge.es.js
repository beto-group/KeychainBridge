const Me = window.dc || window.datacore, { h: Ye, Fragment: We } = Me.preact, C = {
  deriveKey: async (n, a) => {
    const r = new TextEncoder(), i = typeof a == "string" ? r.encode(a) : a, d = await window.crypto.subtle.importKey(
      "raw",
      r.encode(n),
      { name: "PBKDF2" },
      !1,
      ["deriveBits", "deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: i,
        iterations: 1e5,
        hash: "SHA-256"
      },
      d,
      { name: "AES-GCM", length: 256 },
      !0,
      ["encrypt", "decrypt"]
    );
  },
  encrypt: async (n, a) => {
    const r = window.crypto.getRandomValues(new Uint8Array(16)), i = window.crypto.getRandomValues(new Uint8Array(12)), d = await C.deriveKey(a, r), s = new TextEncoder().encode(JSON.stringify(n)), o = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: i }, d, s), b = new Uint8Array(r.length + i.length + o.byteLength);
    return b.set(r, 0), b.set(i, r.length), b.set(new Uint8Array(o), r.length + i.length), btoa(String.fromCharCode.apply(null, b));
  },
  decrypt: async (n, a) => {
    try {
      const r = new Uint8Array(atob(n).split("").map((p) => p.charCodeAt(0))), i = r.slice(0, 16), d = r.slice(16, 28), s = r.slice(28), o = await C.deriveKey(a, i), b = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: d }, o, s);
      return JSON.parse(new TextDecoder().decode(b));
    } catch {
      throw new Error("Incorrect Password.");
    }
  },
  // Used by WebFallbackProvider for encrypting localized strings using an already-derived key
  encryptString: async (n, a) => {
    const r = window.crypto.getRandomValues(new Uint8Array(12)), i = new TextEncoder(), d = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: r },
      a,
      i.encode(n)
    ), s = new Uint8Array(d), o = new Uint8Array(r.length + s.length);
    return o.set(r), o.set(s, r.length), btoa(String.fromCharCode.apply(null, o));
  },
  decryptString: async (n, a) => {
    const r = new Uint8Array(atob(n).split("").map((b) => b.charCodeAt(0))), i = r.slice(0, 12), d = r.slice(12), s = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: i },
      a,
      d
    );
    return new TextDecoder().decode(s);
  }
}, B = window.dc || window.datacore, { h: Ge, Fragment: He } = B.preact;
class $e {
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
const he = typeof window < "u" && window.Capacitor && window.Capacitor.isNative;
class Oe {
  constructor() {
    this.prefix = "datacore_keychain_";
  }
  async _getPlugin() {
    if (he)
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
      return r.filter((i) => i.startsWith(this.prefix)).map((i) => i.replace(this.prefix, ""));
    } catch {
      return [];
    }
  }
  async getSecret(a) {
    const r = await this._getPlugin();
    if (!r) return null;
    try {
      const { value: i } = await r.get({ key: this.prefix + a });
      return i;
    } catch {
      return null;
    }
  }
  async setSecret(a, r) {
    const i = await this._getPlugin();
    if (i)
      try {
        await i.set({ key: this.prefix + a, value: r });
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
class ze {
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
    const i = this._getVault();
    i[a] = await C.encryptString(r, this.masterKey), this._saveVault(i);
  }
  async deleteSecret(a) {
    const r = this._getVault();
    delete r[a], this._saveVault(r);
  }
}
var fe;
const Ue = typeof B < "u" && ((fe = B == null ? void 0 : B.app) == null ? void 0 : fe.secretStorage);
let K = null;
he ? K = new Oe() : Ue ? K = new $e(typeof B < "u" ? B : window) : K = new ze();
const I = {
  provider: K,
  list: async () => await K.listSecrets(),
  get: async (n) => await K.getSecret(n),
  set: async (n, a) => await K.setSecret(n, a),
  delete: async (n) => await K.deleteSecret(n)
}, Ne = window.dc || window.datacore, { h: je, Fragment: Je } = Ne.preact;
function _e() {
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
      let i = "var(--text-muted)", d = "var(--background-secondary-alt)", s = "var(--border-color)";
      return r === "SECURE MODE" || r === "READY" || r === "✓ SECURE" ? (i = "var(--text-success)", d = "rgba(var(--mono-rgb-100), 0.05)", s = "var(--text-success)") : (r === "LOCKED" || r === "API ERROR" || r === "SAVE FAILED" || r === "MIGRATION FAILED") && (i = "var(--text-error)", d = "rgba(var(--mono-rgb-100), 0.05)", s = "var(--text-error)"), {
        padding: "4px 10px",
        borderRadius: "12px",
        fontSize: "10px",
        fontWeight: "bold",
        textTransform: "uppercase",
        color: i,
        background: d,
        border: `1px solid ${s}`,
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
const re = window.dc || window.datacore, { h: V, Fragment: qe } = re.preact;
function Le({ onReload: n, onToggle: a, styles: r, isFullTab: i }) {
  const d = r.theme, s = {
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
  return V(
    "div",
    { style: s.group },
    V(
      "button",
      {
        style: s.button,
        onClick: n,
        title: "Reload Code",
        onMouseOver: (o) => {
          o.currentTarget.style.color = d.accent, o.currentTarget.style.background = "rgba(255,255,255,0.05)";
        },
        onMouseOut: (o) => {
          o.currentTarget.style.color = "var(--text-muted)", o.currentTarget.style.background = "none";
        }
      },
      V(re.Icon, { icon: "rotate-cw", style: { width: "14px", height: "14px" } })
    ),
    V(
      "button",
      {
        style: s.button,
        onClick: a,
        title: i ? "Collapse to Compact" : "Expand to Full Tab",
        onMouseOver: (o) => {
          o.currentTarget.style.color = d.accent, o.currentTarget.style.background = "rgba(255,255,255,0.05)";
        },
        onMouseOut: (o) => {
          o.currentTarget.style.color = "var(--text-muted)", o.currentTarget.style.background = "none";
        }
      },
      V(re.Icon, { icon: i ? "minimize-2" : "maximize-2", style: { width: "14px", height: "14px" } })
    )
  );
}
const u = window.dc || window.datacore, { h: t, Fragment: Fe } = u.preact, { useState: f, useEffect: ge, useRef: Qe } = u;
function Ve({ folderPath: n, onCodeReloadRequest: a, isFullTab: r, onToggleFullTab: i }) {
  const d = _e(), s = d.theme, o = d, b = n + "/data", p = {
    canary: b + "/handshake.enc",
    backup: b + "/vault-secrets.bak.enc",
    history: b + "/bridge-history.json",
    archives: b + "/archives"
  }, [w, O] = f("LOADING"), [m, be] = f(""), [j, xe] = f(""), [ae, D] = f(null), [S, v] = f(!1), [Y, oe] = f(null), [W, z] = f("Initializing Native API..."), [M, we] = f([]), [k, U] = f({}), [h, $] = f(null), [A, me] = f([]), [J, Se] = f([]), [ne, se] = f(null), [ve, N] = f([]), [_, ie] = f(""), [L, ce] = f(""), [P, le] = f("SYSTEM"), y = async (e, c = "info") => {
    const l = { msg: e, type: c, time: (/* @__PURE__ */ new Date()).toISOString() };
    try {
      const x = u.app.vault.adapter;
      let g = [];
      if (await x.exists(p.history))
        try {
          g = JSON.parse(await x.read(p.history));
        } catch {
        }
      g.unshift(l), await x.write(p.history, JSON.stringify(g.slice(0, 200), null, 2)), N(g);
    } catch {
      N((g) => [l, ...g]);
    }
  }, ke = async () => {
    try {
      const e = u.app.vault.adapter;
      if (await e.exists(p.history)) {
        const c = await e.read(p.history);
        N(JSON.parse(c));
      }
    } catch {
      N([]);
    }
  }, T = async () => {
    const e = await I.list();
    we(e);
  }, q = () => {
    const e = ["token", "key", "secret", "password", "auth", "cred", "api"], c = ["antigravity_debug_config", "antigravity_usage_stats_v1", "antigravity_accounts_v2", "handshake.enc"], l = [];
    for (let x = 0; x < localStorage.length; x++) {
      const g = localStorage.key(x);
      if (g && !c.includes(g) && e.some((E) => g.toLowerCase().includes(E))) {
        const E = localStorage.getItem(g);
        E && E.length < 1e3 && l.push(g);
      }
    }
    me(l);
  }, Q = async () => {
    const e = u.app.vault.adapter;
    if (!await e.exists(p.archives))
      return await e.mkdir(p.archives), [];
    const l = ((await e.list(p.archives)).files || []).filter((x) => x.includes("bak.")).sort().reverse();
    return Se(l), l;
  }, de = async (e, c = p.backup) => {
    try {
      const l = u.app.vault.adapter;
      if (await l.exists(c)) {
        const x = await l.read(c), g = await C.decrypt(x, e);
        U(g), se(c.split("/").pop());
      } else
        U({});
    } catch {
      U({});
    }
  }, Ee = async () => {
    try {
      const e = u.app.vault.adapter;
      await e.exists(b) || await e.mkdir(b), await e.exists(p.archives) || await e.mkdir(p.archives), await e.exists(p.canary) ? (O("LOCKED"), z("LOCKED")) : (O("SETUP"), z("SETUP REQUIRED")), await ke(), await T(), q();
    } catch {
      O("SETUP"), z("SETUP REQUIRED");
    }
  };
  ge(() => {
    Ee();
  }, []), ge(() => {
    if (w !== "READY") return;
    const e = setInterval(() => {
      T(), q();
    }, 4e3);
    return () => clearInterval(e);
  }, [w]);
  const X = async () => {
    if (m) {
      if (m !== j)
        return D("Passwords do not match.");
      v(!0), D(null);
      try {
        const e = { verifier: "BETO_IDENTITY_VERIFIED", created: Date.now() }, c = await C.encrypt(e, m);
        await u.app.vault.adapter.write(p.canary, c), oe(m), O("READY"), z("SECURE MODE"), await T(), await y("Master Identity Secured and Keychain Bridge Initialized.", "success");
      } catch (e) {
        D(e.message), await y("Bridge Setup Failed: " + e.message, "error");
      } finally {
        v(!1);
      }
    }
  }, pe = async () => {
    if (m) {
      v(!0), D(null);
      try {
        const e = await u.app.vault.adapter.read(p.canary);
        await C.decrypt(e, m), oe(m), O("READY"), z("SECURE MODE"), await T(), await de(m), await Q(), await y("Vault key decrypted successfully. Access granted.", "success");
      } catch {
        D("Incorrect master passphrase."), await y("Failed unlock attempt.", "error");
      } finally {
        v(!1);
      }
    }
  }, Ce = async () => {
    if (!(!_ || !L)) {
      v(!0);
      try {
        const e = _.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 64);
        await I.set(e, L), await y(`Stored secret "${e}" in system keychain.`, "success"), ie(""), ce(""), await T();
      } catch (e) {
        await y(`Failed storing secret: ${e.message}`, "error");
      } finally {
        v(!1);
      }
    }
  }, Te = async (e) => {
    $({ id: e, loading: !0 });
    try {
      const c = await I.get(e);
      $({ id: e, value: c, loading: !1 });
    } catch (c) {
      $({ id: e, error: c.message, loading: !1 });
    }
  }, Ie = async () => {
    if (!Y) return;
    v(!0), await y("Creating encrypted credential snapshot...", "info");
    const e = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"), [c, l] = e.split("T"), x = c.replace(/-/g, "") + "_" + l.split("-").slice(0, 2).join("");
    try {
      const g = await I.list(), E = { ...k };
      let ee = 0;
      for (const R of g) {
        const ye = await I.get(R), te = k[R];
        if (te !== void 0 && te !== ye) {
          const Be = `${R} [V_${x}]`;
          E[Be] = te, ee++;
        }
        E[R] = ye;
      }
      const ue = await C.encrypt(E, Y);
      await u.app.vault.adapter.write(p.backup, ue);
      const Pe = `${p.archives}/bak.${e}.enc`;
      await u.app.vault.adapter.write(Pe, ue);
      const H = await Q();
      if (H && H.length > 10) {
        for (let R = 10; R < H.length; R++)
          await u.app.vault.adapter.remove(H[R]);
        await Q();
      }
      U(E), se(`bak.${e}.enc`), await y(`Backup complete. Stored ${Object.keys(E).length} keys. ${ee ? `(${ee} versions archived)` : "Clean Sync."}`, "success"), await T();
    } catch (g) {
      await y(`Backup failed: ${g.message}`, "error");
    } finally {
      v(!1);
    }
  }, Ae = async () => {
    v(!0), await y("Omni-redeploying secrets to OS Keychain...", "info");
    try {
      const e = Object.keys(k);
      let c = 0;
      for (const l of e) {
        if (l.includes("[V_")) continue;
        await I.get(l) !== k[l] && (await I.set(l, k[l]), c++);
      }
      await y(`Omni-Restore completed. Recovered/updated ${c} secrets.`, "success"), await T();
    } catch (e) {
      await y(`Restore failed: ${e.message}`, "error");
    } finally {
      v(!1);
    }
  }, Re = async (e) => {
    if (confirm(`Permanently purge "${e}" from your computer's keychain?`))
      try {
        await I.delete(e), await y(`Purged system key "${e}".`, "success"), await T(), (h == null ? void 0 : h.id) === e && $(null);
      } catch (c) {
        await y(`Purge failed: ${c.message}`, "error");
      }
  }, Ke = async (e) => {
    if (confirm(`Remove "${e}" from backup? (Requires saving backup file)`))
      try {
        const c = { ...k };
        delete c[e];
        const l = await C.encrypt(c, Y);
        await u.app.vault.adapter.write(p.backup, l), U(c), await y(`Erased "${e}" from backup snapshot.`, "success");
      } catch (c) {
        await y(`Backup edit failed: ${c.message}`, "error");
      }
  }, De = async () => {
    if (confirm(`Secure and migrate all ${A.length} discovered keys into OS Keychain?`)) {
      v(!0);
      try {
        for (const e of A) {
          const c = localStorage.getItem(e), l = e.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 64);
          await I.set(l, c), localStorage.removeItem(e);
        }
        await y(`Migrated ${A.length} credentials from plain-text localStorage.`, "success"), q(), await T();
      } catch (e) {
        await y(`Migration failed: ${e.message}`, "error");
      } finally {
        v(!1);
      }
    }
  }, F = (e) => t(
    "span",
    {
      style: { marginLeft: "6px", verticalAlign: "middle", display: "inline-flex", opacity: 0.6, cursor: "help" },
      title: e
    },
    t(u.Icon, { icon: "help-circle", style: { width: "13px", height: "13px" } })
  );
  if (!r)
    return t(
      "div",
      { style: o.compactWrapper, onClick: i },
      t(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "12px" } },
        t(u.Icon, { icon: "shield", style: { width: 18, color: A.length > 0 ? "#f87171" : "#4ade80" } }),
        t(u.Icon, { icon: "key", style: { width: 18, color: "#4ade80" } }),
        t("span", { style: o.compactText }, `Keychain Bridge • ${M.length} Keys ${A.length > 0 ? `(+${A.length} Leaks)` : ""}`)
      ),
      t("div", { style: o.badge(W) }, W)
    );
  const G = m && m === j, Z = !!m;
  return t(
    "div",
    { style: o.wrapper },
    t("style", null, o.globalCss),
    // Upper-Right controls
    t(
      "div",
      { style: { position: "absolute", top: "24px", right: "24px", zIndex: 100 } },
      t(Le, { onReload: a, onToggle: i, styles: o, isFullTab: r })
    ),
    t(
      "div",
      { style: o.headerData },
      t("h1", { style: o.title }, "KEYCHAIN BRIDGE"),
      t(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "16px", marginTop: "6px" } },
        t("div", { style: o.subtitle }, "Unified Local OS Keyring & Encrypted backups"),
        t("div", { style: o.badge(W) }, W)
      )
    ),
    // Locked / Setup Handshake Screen
    (w === "LOCKED" || w === "SETUP") && t(
      "div",
      { style: { display: "flex", flex: 1, alignItems: "center", justifyContent: "center" } },
      t(
        "div",
        { style: { ...o.glassCard, width: "400px", padding: "24px", gap: "16px", flex: "none", justifyContent: "center" } },
        t(
          "h3",
          { style: { margin: 0, textAlign: "center", color: "#fff", fontSize: "15px", fontWeight: "bold" } },
          w === "SETUP" ? "KEYRING BRIDGE CONFIGURATION" : "ENTER MASTER PASSPHRASE"
        ),
        t(
          "p",
          { style: { margin: 0, fontSize: "11px", color: s.foregroundMuted, textAlign: "center", lineHeight: "1.4" } },
          w === "SETUP" ? "Set a master password to encrypt your credential backups in your local vault. We do not store this password." : "Enter your master passphrase to unlock the local secure credential bridge and load backups."
        ),
        t(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "10px" } },
          t("input", {
            style: o.input,
            type: "password",
            placeholder: "Master Passphrase",
            value: m,
            onChange: (e) => {
              be(e.target.value), D(null);
            },
            onKeyDown: (e) => {
              e.key === "Enter" && !S && (w === "SETUP" ? G && X() : Z && pe());
            },
            autoFocus: !0
          }),
          w === "SETUP" && t("input", {
            style: o.input,
            type: "password",
            placeholder: "Confirm Passphrase",
            value: j,
            onChange: (e) => {
              xe(e.target.value), D(null);
            },
            onKeyDown: (e) => {
              e.key === "Enter" && G && !S && X();
            }
          })
        ),
        ae && t("div", { style: { color: "#f87171", fontSize: "11px", textAlign: "center", fontWeight: "bold" } }, ae),
        t("button", {
          style: o.buttonPrimary(w === "SETUP" ? !G || S : !Z || S),
          disabled: w === "SETUP" ? !G || S : !Z || S,
          onClick: w === "SETUP" ? X : pe
        }, S ? "Decrypting..." : w === "SETUP" ? "INITIALIZE KEYCHAIN BRIDGE" : "UNLOCK KEYCHAIN BRIDGE")
      )
    ),
    // Authenticated Worksheets
    w === "READY" && t(
      Fe,
      null,
      // Security Leaks Banner
      A.length > 0 && t(
        "div",
        { style: o.leakBox },
        t(
          "div",
          null,
          t(
            "div",
            { style: { color: "#f87171", fontWeight: "bold", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" } },
            t(u.Icon, { icon: "alert-triangle", style: { width: 14 } }),
            "SECURITY LEAK DETECTED"
          ),
          t(
            "div",
            { style: { fontSize: "11px", color: s.foregroundMuted, marginTop: "2px" } },
            `${A.length} sensitive item(s) found in plain-text storage. A single click will move them to your OS keychain.`
          )
        ),
        t("button", { style: { ...o.buttonSecondary, background: "#f87171", color: "#fff", border: "none", fontWeight: "600" }, onClick: De }, "MIGRATE ALL TO KEYCHAIN")
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
                F("Operations to sync your credentials between this computer and your local vault backup.")
              )
            ),
            t("button", { style: o.buttonPrimary(S), disabled: S, onClick: Ie }, "Export Computer Keys to Backup (.enc)"),
            t("button", {
              style: { ...o.buttonSecondary, marginTop: "4px", width: "100%", padding: "10px" },
              disabled: S || Object.keys(k).length === 0,
              onClick: Ae
            }, "Import Backup (.enc) to Computer"),
            t(
              "div",
              { style: { borderTop: `1px solid ${s.border}`, paddingTop: "12px", marginTop: "10px" } },
              t(
                "div",
                { style: { color: s.foregroundMuted, fontSize: "10px", fontWeight: "bold", marginBottom: "8px" } },
                "ADD KEY TO COMPUTER",
                F("Saves a new secret credential directly to your computer's secure OS keychain.")
              ),
              t(
                "div",
                { style: o.inputGroup },
                t("input", {
                  style: o.input,
                  placeholder: "Identifier / Name (e.g. openai-key)",
                  value: _,
                  onChange: (e) => ie(e.target.value)
                }),
                t("input", {
                  style: o.input,
                  type: "password",
                  placeholder: "Secret Value (Token/Password)",
                  value: L,
                  onChange: (e) => ce(e.target.value)
                }),
                t("button", {
                  style: o.buttonPrimary(!_ || !L || S),
                  disabled: !_ || !L || S,
                  onClick: Ce
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
            { style: { display: "flex", gap: "5px", padding: "4px", background: s.backgroundAlt2, borderRadius: "6px", flexShrink: 0 } },
            t(
              "button",
              { style: o.tabBtn(P === "SYSTEM"), onClick: () => le("SYSTEM") },
              "ON COMPUTER",
              F("Credentials currently stored securely in your OS Keychain.")
            ),
            t(
              "button",
              { style: o.tabBtn(P === "BACKUP"), onClick: () => le("BACKUP") },
              "IN BACKUP FILE",
              F("Credentials stored in your encrypted backup snapshot file.")
            )
          ),
          P === "BACKUP" && J.length > 0 && t(
            "div",
            { style: { padding: "8px 10px", background: s.backgroundAlt2, borderRadius: "4px", display: "flex", gap: "10px", alignItems: "center", flexShrink: 0 } },
            t("span", { style: { fontSize: "9px", opacity: 0.6, fontWeight: "bold" } }, "SNAPSHOTS:"),
            t(
              "select",
              {
                style: { background: s.backgroundAlt, color: s.accent, border: `1px solid ${s.border}`, fontSize: "10px", flex: 1, padding: "4px" },
                value: ne === "vault-secrets.bak.enc" ? J[0] : ne,
                onChange: (e) => de(Y, e.target.value.includes("/") ? e.target.value : `${p.archives}/${e.target.value}`)
              },
              J.map(
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
                  (h == null ? void 0 : h.id) === e && t(
                    "div",
                    { style: o.resultPanel },
                    h.loading ? t("span", { style: { fontSize: "11px", color: s.foregroundMuted } }, "Decrypting...") : h.error ? t("span", { style: { fontSize: "11px", color: s.red } }, `Error: ${h.error}`) : t("div", { style: o.resultCode }, h.value)
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
                        (h == null ? void 0 : h.id) === e ? $(null) : P === "SYSTEM" ? Te(e) : $({ id: e, value: k[e], loading: !1 });
                      }
                    },
                    t(u.Icon, { icon: (h == null ? void 0 : h.id) === e ? "eye-off" : "eye", style: { width: 14 } })
                  ),
                  t(
                    "button",
                    {
                      className: "keychain-bridge-delete-btn",
                      onClick: () => P === "SYSTEM" ? Re(e) : Ke(e)
                    },
                    t(u.Icon, { icon: "trash-2", style: { width: 14 } })
                  )
                )
              )
            ),
            (P === "SYSTEM" ? M : Object.keys(k)).length === 0 && t(
              "div",
              { style: { padding: "40px", textAlign: "center", color: s.foregroundMuted, fontSize: "12px" } },
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
              F("Audited trail of keychain actions, unlocks, backups, and restores.")
            ),
            t("button", {
              style: { background: "none", border: "none", color: s.foregroundMuted, cursor: "pointer", fontSize: "9px" },
              onClick: () => {
                N([]);
                try {
                  u.app.vault.adapter.remove(p.history);
                } catch {
                }
              }
            }, "CLEAR")
          ),
          t(
            "div",
            { style: o.scroll },
            ve.map(
              (e, c) => t(
                "div",
                { key: c, className: "keychain-bridge-log-item" },
                t("div", { style: { opacity: 0.4, fontSize: "8px", color: s.foregroundMuted } }, new Date(e.time).toLocaleString()),
                t("div", { style: { color: e.type === "success" ? s.green : e.type === "error" ? s.red : s.foreground, fontSize: "11px", marginTop: "2px" } }, e.msg)
              )
            )
          ),
          t(
            "div",
            { style: { marginTop: "auto", padding: "12px", background: s.backgroundAlt2, borderRadius: "6px", border: `1px solid ${s.border}`, flexShrink: 0 } },
            t("div", { style: { fontSize: "13px", fontWeight: "bold", color: "#fff" } }, `${M.length} System Keys`),
            t(
              "div",
              { style: { fontSize: "11px", color: Object.keys(k).filter((e) => !M.includes(e)).length > 0 ? s.red : s.green, marginTop: "2px" } },
              Object.keys(k).filter((e) => !M.includes(e)).length > 0 ? "Sync Mismatch: Keys pending backup" : "✓ Secure System Sync"
            )
          )
        )
      )
    )
  );
}
function Xe(n, a, r = {}) {
  window.React || (window.React = a.preact), window.ReactDOM || (window.ReactDOM = a.preact);
  const { h: i, render: d } = a.preact, s = {
    folderPath: r.folderPath || "KEYCHAIN BRIDGE",
    isFullTab: r.isFullTab !== void 0 ? r.isFullTab : !0,
    onCodeReloadRequest: r.onCodeReloadRequest || (() => {
    }),
    onToggleFullTab: r.onToggleFullTab || (() => {
    }),
    dc: a
  };
  return d(i(Ve, s), n), () => {
    d(null, n);
  };
}
export {
  Ve as KeychainBridge,
  Xe as mount_app
};
