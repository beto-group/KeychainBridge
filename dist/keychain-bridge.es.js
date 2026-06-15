const T = {
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
    const r = window.crypto.getRandomValues(new Uint8Array(16)), i = window.crypto.getRandomValues(new Uint8Array(12)), d = await T.deriveKey(a, r), s = new TextEncoder().encode(JSON.stringify(n)), o = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: i }, d, s), x = new Uint8Array(r.length + i.length + o.byteLength);
    return x.set(r, 0), x.set(i, r.length), x.set(new Uint8Array(o), r.length + i.length), btoa(String.fromCharCode.apply(null, x));
  },
  decrypt: async (n, a) => {
    try {
      const r = new Uint8Array(atob(n).split("").map((p) => p.charCodeAt(0))), i = r.slice(0, 16), d = r.slice(16, 28), s = r.slice(28), o = await T.deriveKey(a, i), x = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: d }, o, s);
      return JSON.parse(new TextDecoder().decode(x));
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
    const r = new Uint8Array(atob(n).split("").map((x) => x.charCodeAt(0))), i = r.slice(0, 12), d = r.slice(12), s = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: i },
      a,
      d
    );
    return new TextDecoder().decode(s);
  }
}, z = window.dc || window.datacore;
class Me {
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
    this.masterKey = await T.deriveKey(a, "datacore_salt_static");
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
      return await T.decryptString(r[a], this.masterKey);
    } catch {
      return console.error("[WebFallback] Decryption failed for secret:", a), null;
    }
  }
  async setSecret(a, r) {
    if (!this.masterKey) throw new Error("Vault locked. Call unlock(password) first.");
    const i = this._getVault();
    i[a] = await T.encryptString(r, this.masterKey), this._saveVault(i);
  }
  async deleteSecret(a) {
    const r = this._getVault();
    delete r[a], this._saveVault(r);
  }
}
var fe;
const $e = typeof z < "u" && ((fe = z == null ? void 0 : z.app) == null ? void 0 : fe.secretStorage);
let D = null;
he ? D = new Oe() : $e ? D = new Me(typeof z < "u" ? z : window) : D = new ze();
const A = {
  provider: D,
  list: async () => await D.listSecrets(),
  get: async (n) => await D.getSecret(n),
  set: async (n, a) => await D.setSecret(n, a),
  delete: async (n) => await D.deleteSecret(n)
};
function Ue() {
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
const ye = window.dc || window.datacore;
function Ne({ onReload: n, onToggle: a, styles: r, isFullTab: i }) {
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
  return h(
    "div",
    { style: s.group },
    h(
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
      h(ye.Icon, { icon: "rotate-cw", style: { width: "14px", height: "14px" } })
    ),
    h(
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
      h(ye.Icon, { icon: i ? "minimize-2" : "maximize-2", style: { width: "14px", height: "14px" } })
    )
  );
}
const u = window.dc || window.datacore, { useState: f, useEffect: ge, useRef: Ve } = u, { h: t, Fragment: _e } = u.preact;
function Le({ folderPath: n, onCodeReloadRequest: a, isFullTab: r, onToggleFullTab: i }) {
  const d = Ue(), s = d.theme, o = d, x = n + "/data", p = {
    canary: x + "/handshake.enc",
    backup: x + "/vault-secrets.bak.enc",
    history: x + "/bridge-history.json",
    archives: x + "/archives"
  }, [m, $] = f("LOADING"), [S, be] = f(""), [j, xe] = f(""), [re, P] = f(null), [v, k] = f(!1), [F, ae] = f(null), [W, U] = f("Initializing Native API..."), [M, we] = f([]), [E, N] = f({}), [b, O] = f(null), [R, me] = f([]), [J, Se] = f([]), [oe, ne] = f(null), [ve, _] = f([]), [L, se] = f(""), [V, ie] = f(""), [B, ce] = f("SYSTEM"), y = async (e, c = "info") => {
    const l = { msg: e, type: c, time: (/* @__PURE__ */ new Date()).toISOString() };
    try {
      const w = u.app.vault.adapter;
      let g = [];
      if (await w.exists(p.history))
        try {
          g = JSON.parse(await w.read(p.history));
        } catch {
        }
      g.unshift(l), await w.write(p.history, JSON.stringify(g.slice(0, 200), null, 2)), _(g);
    } catch {
      _((g) => [l, ...g]);
    }
  }, ke = async () => {
    try {
      const e = u.app.vault.adapter;
      if (await e.exists(p.history)) {
        const c = await e.read(p.history);
        _(JSON.parse(c));
      }
    } catch {
      _([]);
    }
  }, I = async () => {
    const e = await A.list();
    we(e);
  }, q = () => {
    const e = ["token", "key", "secret", "password", "auth", "cred", "api"], c = ["antigravity_debug_config", "antigravity_usage_stats_v1", "antigravity_accounts_v2", "handshake.enc"], l = [];
    for (let w = 0; w < localStorage.length; w++) {
      const g = localStorage.key(w);
      if (g && !c.includes(g) && e.some((C) => g.toLowerCase().includes(C))) {
        const C = localStorage.getItem(g);
        C && C.length < 1e3 && l.push(g);
      }
    }
    me(l);
  }, Q = async () => {
    const e = u.app.vault.adapter;
    if (!await e.exists(p.archives))
      return await e.mkdir(p.archives), [];
    const l = ((await e.list(p.archives)).files || []).filter((w) => w.includes("bak.")).sort().reverse();
    return Se(l), l;
  }, le = async (e, c = p.backup) => {
    try {
      const l = u.app.vault.adapter;
      if (await l.exists(c)) {
        const w = await l.read(c), g = await T.decrypt(w, e);
        N(g), ne(c.split("/").pop());
      } else
        N({});
    } catch {
      N({});
    }
  }, Ee = async () => {
    try {
      const e = u.app.vault.adapter;
      await e.exists(x) || await e.mkdir(x), await e.exists(p.archives) || await e.mkdir(p.archives), await e.exists(p.canary) ? ($("LOCKED"), U("LOCKED")) : ($("SETUP"), U("SETUP REQUIRED")), await ke(), await I(), q();
    } catch {
      $("SETUP"), U("SETUP REQUIRED");
    }
  };
  ge(() => {
    Ee();
  }, []), ge(() => {
    if (m !== "READY") return;
    const e = setInterval(() => {
      I(), q();
    }, 4e3);
    return () => clearInterval(e);
  }, [m]);
  const X = async () => {
    if (S) {
      if (S !== j)
        return P("Passwords do not match.");
      k(!0), P(null);
      try {
        const e = { verifier: "BETO_IDENTITY_VERIFIED", created: Date.now() }, c = await T.encrypt(e, S);
        await u.app.vault.adapter.write(p.canary, c), ae(S), $("READY"), U("SECURE MODE"), await I(), await y("Master Identity Secured and Keychain Bridge Initialized.", "success");
      } catch (e) {
        P(e.message), await y("Bridge Setup Failed: " + e.message, "error");
      } finally {
        k(!1);
      }
    }
  }, de = async () => {
    if (S) {
      k(!0), P(null);
      try {
        const e = await u.app.vault.adapter.read(p.canary);
        await T.decrypt(e, S), ae(S), $("READY"), U("SECURE MODE"), await I(), await le(S), await Q(), await y("Vault key decrypted successfully. Access granted.", "success");
      } catch {
        P("Incorrect master passphrase."), await y("Failed unlock attempt.", "error");
      } finally {
        k(!1);
      }
    }
  }, Ce = async () => {
    if (!(!L || !V)) {
      k(!0);
      try {
        const e = L.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 64);
        await A.set(e, V), await y(`Stored secret "${e}" in system keychain.`, "success"), se(""), ie(""), await I();
      } catch (e) {
        await y(`Failed storing secret: ${e.message}`, "error");
      } finally {
        k(!1);
      }
    }
  }, Te = async (e) => {
    O({ id: e, loading: !0 });
    try {
      const c = await A.get(e);
      O({ id: e, value: c, loading: !1 });
    } catch (c) {
      O({ id: e, error: c.message, loading: !1 });
    }
  }, Ie = async () => {
    if (!F) return;
    k(!0), await y("Creating encrypted credential snapshot...", "info");
    const e = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"), [c, l] = e.split("T"), w = c.replace(/-/g, "") + "_" + l.split("-").slice(0, 2).join("");
    try {
      const g = await A.list(), C = { ...E };
      let ee = 0;
      for (const K of g) {
        const ue = await A.get(K), te = E[K];
        if (te !== void 0 && te !== ue) {
          const Be = `${K} [V_${w}]`;
          C[Be] = te, ee++;
        }
        C[K] = ue;
      }
      const pe = await T.encrypt(C, F);
      await u.app.vault.adapter.write(p.backup, pe);
      const Pe = `${p.archives}/bak.${e}.enc`;
      await u.app.vault.adapter.write(Pe, pe);
      const H = await Q();
      if (H && H.length > 10) {
        for (let K = 10; K < H.length; K++)
          await u.app.vault.adapter.remove(H[K]);
        await Q();
      }
      N(C), ne(`bak.${e}.enc`), await y(`Backup complete. Stored ${Object.keys(C).length} keys. ${ee ? `(${ee} versions archived)` : "Clean Sync."}`, "success"), await I();
    } catch (g) {
      await y(`Backup failed: ${g.message}`, "error");
    } finally {
      k(!1);
    }
  }, Ae = async () => {
    k(!0), await y("Omni-redeploying secrets to OS Keychain...", "info");
    try {
      const e = Object.keys(E);
      let c = 0;
      for (const l of e) {
        if (l.includes("[V_")) continue;
        await A.get(l) !== E[l] && (await A.set(l, E[l]), c++);
      }
      await y(`Omni-Restore completed. Recovered/updated ${c} secrets.`, "success"), await I();
    } catch (e) {
      await y(`Restore failed: ${e.message}`, "error");
    } finally {
      k(!1);
    }
  }, Re = async (e) => {
    if (confirm(`Permanently purge "${e}" from your computer's keychain?`))
      try {
        await A.delete(e), await y(`Purged system key "${e}".`, "success"), await I(), (b == null ? void 0 : b.id) === e && O(null);
      } catch (c) {
        await y(`Purge failed: ${c.message}`, "error");
      }
  }, Ke = async (e) => {
    if (confirm(`Remove "${e}" from backup? (Requires saving backup file)`))
      try {
        const c = { ...E };
        delete c[e];
        const l = await T.encrypt(c, F);
        await u.app.vault.adapter.write(p.backup, l), N(c), await y(`Erased "${e}" from backup snapshot.`, "success");
      } catch (c) {
        await y(`Backup edit failed: ${c.message}`, "error");
      }
  }, De = async () => {
    if (confirm(`Secure and migrate all ${R.length} discovered keys into OS Keychain?`)) {
      k(!0);
      try {
        for (const e of R) {
          const c = localStorage.getItem(e), l = e.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 64);
          await A.set(l, c), localStorage.removeItem(e);
        }
        await y(`Migrated ${R.length} credentials from plain-text localStorage.`, "success"), q(), await I();
      } catch (e) {
        await y(`Migration failed: ${e.message}`, "error");
      } finally {
        k(!1);
      }
    }
  }, Y = (e) => t(
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
        t(u.Icon, { icon: "shield", style: { width: 18, color: R.length > 0 ? "#f87171" : "#4ade80" } }),
        t(u.Icon, { icon: "key", style: { width: 18, color: "#4ade80" } }),
        t("span", { style: o.compactText }, `Keychain Bridge • ${M.length} Keys ${R.length > 0 ? `(+${R.length} Leaks)` : ""}`)
      ),
      t("div", { style: o.badge(W) }, W)
    );
  const G = S && S === j, Z = !!S;
  return t(
    "div",
    { style: o.wrapper },
    t("style", null, o.globalCss),
    // Upper-Right controls
    t(
      "div",
      { style: { position: "absolute", top: "24px", right: "24px", zIndex: 100 } },
      t(Ne, { onReload: a, onToggle: i, styles: o, isFullTab: r })
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
          { style: { margin: 0, fontSize: "11px", color: s.foregroundMuted, textAlign: "center", lineHeight: "1.4" } },
          m === "SETUP" ? "Set a master password to encrypt your credential backups in your local vault. We do not store this password." : "Enter your master passphrase to unlock the local secure credential bridge and load backups."
        ),
        t(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "10px" } },
          t("input", {
            style: o.input,
            type: "password",
            placeholder: "Master Passphrase",
            value: S,
            onChange: (e) => {
              be(e.target.value), P(null);
            },
            onKeyDown: (e) => {
              e.key === "Enter" && !v && (m === "SETUP" ? G && X() : Z && de());
            },
            autoFocus: !0
          }),
          m === "SETUP" && t("input", {
            style: o.input,
            type: "password",
            placeholder: "Confirm Passphrase",
            value: j,
            onChange: (e) => {
              xe(e.target.value), P(null);
            },
            onKeyDown: (e) => {
              e.key === "Enter" && G && !v && X();
            }
          })
        ),
        re && t("div", { style: { color: "#f87171", fontSize: "11px", textAlign: "center", fontWeight: "bold" } }, re),
        t("button", {
          style: o.buttonPrimary(m === "SETUP" ? !G || v : !Z || v),
          disabled: m === "SETUP" ? !G || v : !Z || v,
          onClick: m === "SETUP" ? X : de
        }, v ? "Decrypting..." : m === "SETUP" ? "INITIALIZE KEYCHAIN BRIDGE" : "UNLOCK KEYCHAIN BRIDGE")
      )
    ),
    // Authenticated Worksheets
    m === "READY" && t(
      _e,
      null,
      // Security Leaks Banner
      R.length > 0 && t(
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
            `${R.length} sensitive item(s) found in plain-text storage. A single click will move them to your OS keychain.`
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
                Y("Operations to sync your credentials between this computer and your local vault backup.")
              )
            ),
            t("button", { style: o.buttonPrimary(v), disabled: v, onClick: Ie }, "Export Computer Keys to Backup (.enc)"),
            t("button", {
              style: { ...o.buttonSecondary, marginTop: "4px", width: "100%", padding: "10px" },
              disabled: v || Object.keys(E).length === 0,
              onClick: Ae
            }, "Import Backup (.enc) to Computer"),
            t(
              "div",
              { style: { borderTop: `1px solid ${s.border}`, paddingTop: "12px", marginTop: "10px" } },
              t(
                "div",
                { style: { color: s.foregroundMuted, fontSize: "10px", fontWeight: "bold", marginBottom: "8px" } },
                "ADD KEY TO COMPUTER",
                Y("Saves a new secret credential directly to your computer's secure OS keychain.")
              ),
              t(
                "div",
                { style: o.inputGroup },
                t("input", {
                  style: o.input,
                  placeholder: "Identifier / Name (e.g. openai-key)",
                  value: L,
                  onChange: (e) => se(e.target.value)
                }),
                t("input", {
                  style: o.input,
                  type: "password",
                  placeholder: "Secret Value (Token/Password)",
                  value: V,
                  onChange: (e) => ie(e.target.value)
                }),
                t("button", {
                  style: o.buttonPrimary(!L || !V || v),
                  disabled: !L || !V || v,
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
              { style: o.tabBtn(B === "SYSTEM"), onClick: () => ce("SYSTEM") },
              "ON COMPUTER",
              Y("Credentials currently stored securely in your OS Keychain.")
            ),
            t(
              "button",
              { style: o.tabBtn(B === "BACKUP"), onClick: () => ce("BACKUP") },
              "IN BACKUP FILE",
              Y("Credentials stored in your encrypted backup snapshot file.")
            )
          ),
          B === "BACKUP" && J.length > 0 && t(
            "div",
            { style: { padding: "8px 10px", background: s.backgroundAlt2, borderRadius: "4px", display: "flex", gap: "10px", alignItems: "center", flexShrink: 0 } },
            t("span", { style: { fontSize: "9px", opacity: 0.6, fontWeight: "bold" } }, "SNAPSHOTS:"),
            t(
              "select",
              {
                style: { background: s.backgroundAlt, color: s.accent, border: `1px solid ${s.border}`, fontSize: "10px", flex: 1, padding: "4px" },
                value: oe === "vault-secrets.bak.enc" ? J[0] : oe,
                onChange: (e) => le(F, e.target.value.includes("/") ? e.target.value : `${p.archives}/${e.target.value}`)
              },
              J.map(
                (e) => t("option", { key: e, value: e }, e.split("bak.").pop().replace(".enc", "").replace(/-/g, ":"))
              )
            )
          ),
          t(
            "div",
            { style: o.scroll },
            (B === "SYSTEM" ? M : Object.keys(E)).map(
              (e) => t(
                "div",
                { key: e, style: o.listItem },
                t(
                  "div",
                  { style: { display: "flex", flexDirection: "column", gap: "2px", flex: 1, minWidth: 0 } },
                  t("span", { style: { fontWeight: "600", fontSize: "13px", color: "#fff", wordBreak: "break-all" } }, e),
                  (b == null ? void 0 : b.id) === e && t(
                    "div",
                    { style: o.resultPanel },
                    b.loading ? t("span", { style: { fontSize: "11px", color: s.foregroundMuted } }, "Decrypting...") : b.error ? t("span", { style: { fontSize: "11px", color: s.red } }, `Error: ${b.error}`) : t("div", { style: o.resultCode }, b.value)
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
                        (b == null ? void 0 : b.id) === e ? O(null) : B === "SYSTEM" ? Te(e) : O({ id: e, value: E[e], loading: !1 });
                      }
                    },
                    t(u.Icon, { icon: (b == null ? void 0 : b.id) === e ? "eye-off" : "eye", style: { width: 14 } })
                  ),
                  t(
                    "button",
                    {
                      className: "keychain-bridge-delete-btn",
                      onClick: () => B === "SYSTEM" ? Re(e) : Ke(e)
                    },
                    t(u.Icon, { icon: "trash-2", style: { width: 14 } })
                  )
                )
              )
            ),
            (B === "SYSTEM" ? M : Object.keys(E)).length === 0 && t(
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
              Y("Audited trail of keychain actions, unlocks, backups, and restores.")
            ),
            t("button", {
              style: { background: "none", border: "none", color: s.foregroundMuted, cursor: "pointer", fontSize: "9px" },
              onClick: () => {
                _([]);
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
              { style: { fontSize: "11px", color: Object.keys(E).filter((e) => !M.includes(e)).length > 0 ? s.red : s.green, marginTop: "2px" } },
              Object.keys(E).filter((e) => !M.includes(e)).length > 0 ? "Sync Mismatch: Keys pending backup" : "✓ Secure System Sync"
            )
          )
        )
      )
    )
  );
}
function Ye(n, a, r = {}) {
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
  return d(i(Le, s), n), () => {
    d(null, n);
  };
}
export {
  Le as KeychainBridge,
  Ye as mount_app
};
