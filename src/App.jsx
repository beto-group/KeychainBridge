const { useState, useEffect, useRef, Fragment } = dc;
const { h } = dc.preact;

// Load subcomponents & helpers
const { Crypto } = await dc.require(dc.resolvePath("KEYCHAIN BRIDGE/src/utils/CryptoUtils.js"));
const { Storage } = await dc.require(dc.resolvePath("KEYCHAIN BRIDGE/src/utils/StorageUtils.js"));
const { getStyles } = await dc.require(dc.resolvePath("KEYCHAIN BRIDGE/src/styles/ViewStyles.jsx"));
const { ControlsMenu } = await dc.require(dc.resolvePath("KEYCHAIN BRIDGE/src/components/ControlsMenu.jsx"));

function KeychainBridgeApp({ folderPath, onCodeReloadRequest, isFullTab, onToggleFullTab }) {
    const stylesData = getStyles();
    const THEME = stylesData.theme;
    const STYLES = stylesData;

    const DATA_DIR = folderPath + "/data";
    const PATHS = {
        canary: DATA_DIR + "/handshake.enc",
        backup: DATA_DIR + "/vault-secrets.bak.enc",
        history: DATA_DIR + "/bridge-history.json",
        archives: DATA_DIR + "/archives"
    };

    // UI & Core Modes
    const [mode, setMode] = useState('LOADING'); // 'LOADING', 'SETUP', 'LOCKED', 'READY'
    const [passphrase, setPassphrase] = useState('');
    const [confirmPassphrase, setConfirmPassphrase] = useState('');
    const [error, setError] = useState(null);
    const [isBusy, setIsBusy] = useState(false);
    
    // Passphrase verified key session
    const [sessionKey, setSessionKey] = useState(null);
    const [statusText, setStatusText] = useState('Initializing Native API...');

    // Core Data States
    const [osKeys, setOsKeys] = useState([]);
    const [backupPayload, setBackupPayload] = useState({});
    const [revealedSecret, setRevealedSecret] = useState(null);
    const [leakedKeys, setLeakedKeys] = useState([]);
    const [snapshots, setSnapshots] = useState([]);
    const [activeSnapshot, setActiveSnapshot] = useState(null);
    const [logs, setLogs] = useState([]);

    // Inputs
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyValue, setNewKeyValue] = useState('');
    const [registryTab, setRegistryTab] = useState('SYSTEM'); // 'SYSTEM', 'BACKUP'

    // Logger Utility
    const logAction = async (msg, type = 'info') => {
        const entry = { msg, type, time: new Date().toISOString() };
        try {
            const adapter = dc.app.vault.adapter;
            let history = [];
            if (await adapter.exists(PATHS.history)) {
                try { history = JSON.parse(await adapter.read(PATHS.history)); } catch (e) {}
            }
            history.unshift(entry);
            await adapter.write(PATHS.history, JSON.stringify(history.slice(0, 200), null, 2));
            setLogs(history);
        } catch (e) {
            setLogs(prev => [entry, ...prev]);
        }
    };

    const loadLogs = async () => {
        try {
            const adapter = dc.app.vault.adapter;
            if (await adapter.exists(PATHS.history)) {
                const content = await adapter.read(PATHS.history);
                setLogs(JSON.parse(content));
            }
        } catch (e) {
            setLogs([]);
        }
    };

    // Refresh OS Keys & Leaks
    const refreshKeys = async () => {
        const list = await Storage.list();
        setOsKeys(list);
    };

    const scanLeaks = () => {
        const patterns = ['token', 'key', 'secret', 'password', 'auth', 'cred', 'api'];
        const ignored = ['antigravity_debug_config', 'antigravity_usage_stats_v1', 'antigravity_accounts_v2', 'handshake.enc'];
        const found = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && !ignored.includes(k) && patterns.some(p => k.toLowerCase().includes(p))) {
                const item = localStorage.getItem(k);
                if (item && item.length < 1000) {
                    found.push(k);
                }
            }
        }
        setLeakedKeys(found);
    };

    const refreshSnapshots = async () => {
        const adapter = dc.app.vault.adapter;
        if (!await adapter.exists(PATHS.archives)) {
            await adapter.mkdir(PATHS.archives);
            return [];
        }
        const list = await adapter.list(PATHS.archives);
        const sorted = (list.files || []).filter(f => f.includes('bak.')).sort().reverse();
        setSnapshots(sorted);
        return sorted;
    };

    const syncBackupData = async (key, file = PATHS.backup) => {
        try {
            const adapter = dc.app.vault.adapter;
            if (await adapter.exists(file)) {
                const content = await adapter.read(file);
                const decoded = await Crypto.decrypt(content, key);
                setBackupPayload(decoded);
                setActiveSnapshot(file.split('/').pop());
            } else {
                setBackupPayload({});
            }
        } catch (e) {
            setBackupPayload({});
        }
    };

    // Initialize Component
    const initialize = async () => {
        try {
            const adapter = dc.app.vault.adapter;
            // Create data dir if not exists
            if (!await adapter.exists(DATA_DIR)) {
                await adapter.mkdir(DATA_DIR);
            }
            if (!await adapter.exists(PATHS.archives)) {
                await adapter.mkdir(PATHS.archives);
            }

            if (await adapter.exists(PATHS.canary)) {
                setMode('LOCKED');
                setStatusText('LOCKED');
            } else {
                setMode('SETUP');
                setStatusText('SETUP REQUIRED');
            }
            
            await loadLogs();
            await refreshKeys();
            scanLeaks();
        } catch (e) {
            setMode('SETUP');
            setStatusText('SETUP REQUIRED');
        }
    };

    useEffect(() => {
        initialize();
    }, []);

    // Active polling for changes in Computer state
    useEffect(() => {
        if (mode !== 'READY') return;
        const heartbeat = setInterval(() => {
            refreshKeys();
            scanLeaks();
        }, 4000);
        return () => clearInterval(heartbeat);
    }, [mode]);

    // Setup Master Password
    const handleSetup = async () => {
        if (!passphrase) return;
        if (passphrase !== confirmPassphrase) {
            return setError("Passwords do not match.");
        }
        setIsBusy(true);
        setError(null);
        try {
            const canary = { verifier: "BETO_IDENTITY_VERIFIED", created: Date.now() };
            const encryptedCanary = await Crypto.encrypt(canary, passphrase);
            await dc.app.vault.adapter.write(PATHS.canary, encryptedCanary);
            
            setSessionKey(passphrase);
            setMode('READY');
            setStatusText('SECURE MODE');
            await refreshKeys();
            await logAction("Master Identity Secured and Keychain Bridge Initialized.", "success");
        } catch (e) {
            setError(e.message);
            await logAction("Bridge Setup Failed: " + e.message, "error");
        } finally {
            setIsBusy(false);
        }
    };

    // Unlock Keyring
    const handleUnlock = async () => {
        if (!passphrase) return;
        setIsBusy(true);
        setError(null);
        try {
            const content = await dc.app.vault.adapter.read(PATHS.canary);
            await Crypto.decrypt(content, passphrase);
            
            setSessionKey(passphrase);
            setMode('READY');
            setStatusText('SECURE MODE');
            
            await refreshKeys();
            await syncBackupData(passphrase);
            await refreshSnapshots();
            await logAction("Vault key decrypted successfully. Access granted.", "success");
        } catch (e) {
            setError("Incorrect master passphrase.");
            await logAction("Failed unlock attempt.", "error");
        } finally {
            setIsBusy(false);
        }
    };

    // Register a Key to Computer OS Keychain
    const handleCreateSecret = async () => {
        if (!newKeyName || !newKeyValue) return;
        setIsBusy(true);
        try {
            const safeKey = newKeyName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 64);
            await Storage.set(safeKey, newKeyValue);
            await logAction(`Stored secret "${safeKey}" in system keychain.`, "success");
            setNewKeyName('');
            setNewKeyValue('');
            await refreshKeys();
        } catch (e) {
            await logAction(`Failed storing secret: ${e.message}`, "error");
        } finally {
            setIsBusy(false);
        }
    };

    // Fetch Credential
    const handleGetSecret = async (id) => {
        setRevealedSecret({ id, loading: true });
        try {
            const val = await Storage.get(id);
            setRevealedSecret({ id, value: val, loading: false });
        } catch (err) {
            setRevealedSecret({ id, error: err.message, loading: false });
        }
    };

    // Sync System Credentials to Encrypted Backup File
    const handleBackup = async () => {
        if (!sessionKey) return;
        setIsBusy(true);
        await logAction("Creating encrypted credential snapshot...", "info");
        
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const [date, time] = ts.split('T');
        const shortTs = date.replace(/-/g, '') + '_' + time.split('-').slice(0, 2).join('');

        try {
            const keys = await Storage.list();
            const mergedPayload = { ...backupPayload };
            let conflicts = 0;

            for (const k of keys) {
                const newVal = await Storage.get(k);
                const oldVal = backupPayload[k];

                if (oldVal !== undefined && oldVal !== newVal) {
                    // Archive the collision variant
                    const archiveName = `${k} [V_${shortTs}]`;
                    mergedPayload[archiveName] = oldVal;
                    conflicts++;
                }
                mergedPayload[k] = newVal;
            }

            const encrypted = await Crypto.encrypt(mergedPayload, sessionKey);
            await dc.app.vault.adapter.write(PATHS.backup, encrypted);
            
            const archiveFile = `${PATHS.archives}/bak.${ts}.enc`;
            await dc.app.vault.adapter.write(archiveFile, encrypted);

            const currentSnapshots = await refreshSnapshots();
            // Retain last 10 snapshots, clean older ones
            if (currentSnapshots && currentSnapshots.length > 10) {
                for (let i = 10; i < currentSnapshots.length; i++) {
                    await dc.app.vault.adapter.remove(currentSnapshots[i]);
                }
                await refreshSnapshots();
            }

            setBackupPayload(mergedPayload);
            setActiveSnapshot(`bak.${ts}.enc`);
            await logAction(`Backup complete. Stored ${Object.keys(mergedPayload).length} keys. ${conflicts ? `(${conflicts} versions archived)` : 'Clean Sync.'}`, "success");
            await refreshKeys();
        } catch (e) {
            await logAction(`Backup failed: ${e.message}`, "error");
        } finally {
            setIsBusy(false);
        }
    };

    // Deploy Backup secrets into OS Keychain
    const handleRestore = async () => {
        setIsBusy(true);
        await logAction("Omni-redeploying secrets to OS Keychain...", "info");
        try {
            const keys = Object.keys(backupPayload);
            let restoredCount = 0;
            for (const k of keys) {
                // Skip conflict archive fields
                if (k.includes('[V_')) continue;
                
                const current = await Storage.get(k);
                if (current !== backupPayload[k]) {
                    await Storage.set(k, backupPayload[k]);
                    restoredCount++;
                }
            }
            await logAction(`Omni-Restore completed. Recovered/updated ${restoredCount} secrets.`, "success");
            await refreshKeys();
        } catch (e) {
            await logAction(`Restore failed: ${e.message}`, "error");
        } finally {
            setIsBusy(false);
        }
    };

    // Delete a key from computer
    const handleDeleteSystem = async (id) => {
        if (!confirm(`Permanently purge "${id}" from your computer's keychain?`)) return;
        try {
            await Storage.delete(id);
            await logAction(`Purged system key "${id}".`, "success");
            await refreshKeys();
            if (revealedSecret?.id === id) setRevealedSecret(null);
        } catch (e) {
            await logAction(`Purge failed: ${e.message}`, "error");
        }
    };

    // Delete a key from backup
    const handleDeleteBackup = async (id) => {
        if (!confirm(`Remove "${id}" from backup? (Requires saving backup file)`)) return;
        try {
            const updated = { ...backupPayload };
            delete updated[id];
            
            const encrypted = await Crypto.encrypt(updated, sessionKey);
            await dc.app.vault.adapter.write(PATHS.backup, encrypted);
            setBackupPayload(updated);
            await logAction(`Erased "${id}" from backup snapshot.`, "success");
        } catch (e) {
            await logAction(`Backup edit failed: ${e.message}`, "error");
        }
    };

    // Secure all localStorage leaks
    const handleMigrateAll = async () => {
        if (!confirm(`Secure and migrate all ${leakedKeys.length} discovered keys into OS Keychain?`)) return;
        setIsBusy(true);
        try {
            for (const k of leakedKeys) {
                const val = localStorage.getItem(k);
                const safeKey = k.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 64);
                await Storage.set(safeKey, val);
                localStorage.removeItem(k);
            }
            await logAction(`Migrated ${leakedKeys.length} credentials from plain-text localStorage.`, "success");
            scanLeaks();
            await refreshKeys();
        } catch (e) {
            await logAction(`Migration failed: ${e.message}`, "error");
        } finally {
            setIsBusy(false);
        }
    };

    // Compact Mode View
    if (!isFullTab) {
        return h('div', { style: STYLES.compactWrapper, onClick: onToggleFullTab },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
                h(dc.Icon, { icon: 'shield', style: { width: 18, color: leakedKeys.length > 0 ? '#f87171' : '#4ade80' } }),
                h(dc.Icon, { icon: 'key', style: { width: 18, color: '#4ade80' } }),
                h('span', { style: STYLES.compactText }, `Keychain Bridge • ${osKeys.length} Keys ${leakedKeys.length > 0 ? `(+${leakedKeys.length} Leaks)` : ''}`)
            ),
            h('div', { style: STYLES.badge(statusText) }, statusText)
        );
    }

    // Passphrase validation
    const isSetupValid = passphrase && passphrase === confirmPassphrase;
    const isUnlockValid = !!passphrase;

    return h('div', { style: STYLES.wrapper },
        h('style', null, STYLES.globalCss),
        
        // Upper-Right controls
        h('div', { style: { position: 'absolute', top: '24px', right: '24px', zIndex: 100 } },
            h(ControlsMenu, { onReload: onCodeReloadRequest, onToggle: onToggleFullTab, styles: STYLES, isFullTab })
        ),

        h('div', { style: STYLES.headerData },
            h('h1', { style: STYLES.title }, 'KEYCHAIN BRIDGE'),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px' } },
                h('div', { style: STYLES.subtitle }, 'Obsidian Native OS Keyring & Encrypted Vault backups'),
                h('div', { style: STYLES.badge(statusText) }, statusText)
            )
        ),

        // Locked / Setup Handshake Screen
        (mode === 'LOCKED' || mode === 'SETUP') && h('div', { style: { display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' } },
            h('div', { style: { ...STYLES.glassCard, width: '400px', padding: '24px', gap: '16px', flex: 'none', justifyContent: 'center' } },
                h('h3', { style: { margin: 0, textAlign: 'center', color: '#fff', fontSize: '15px', fontWeight: 'bold' } }, 
                    mode === 'SETUP' ? 'KEYRING BRIDGE CONFIGURATION' : 'BRIDGE KEY DECRYPT REQUIRED'
                ),
                h('p', { style: { margin: 0, fontSize: '11px', color: THEME.foregroundMuted, textAlign: 'center', lineHeight: '1.4' } },
                    mode === 'SETUP' 
                        ? 'Set a master password to encrypt your credential backups in your local vault. We do not store this password.'
                        : 'Enter your master passphrase to unlock the local secure credential bridge and load backups.'
                ),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
                    h('input', {
                        style: STYLES.input,
                        type: 'password',
                        placeholder: 'Master Passphrase',
                        value: passphrase,
                        onChange: e => { setPassphrase(e.target.value); setError(null); },
                        onKeyDown: e => { if (e.key === 'Enter' && !isBusy) { mode === 'SETUP' ? (isSetupValid && handleSetup()) : (isUnlockValid && handleUnlock()); } },
                        autoFocus: true
                    }),
                    mode === 'SETUP' && h('input', {
                        style: STYLES.input,
                        type: 'password',
                        placeholder: 'Confirm Passphrase',
                        value: confirmPassphrase,
                        onChange: e => { setConfirmPassphrase(e.target.value); setError(null); },
                        onKeyDown: e => { if (e.key === 'Enter' && isSetupValid && !isBusy) handleSetup(); }
                    })
                ),
                error && h('div', { style: { color: '#f87171', fontSize: '11px', textAlign: 'center', fontWeight: 'bold' } }, error),
                h('button', {
                    style: STYLES.buttonPrimary(mode === 'SETUP' ? !isSetupValid || isBusy : !isUnlockValid || isBusy),
                    disabled: mode === 'SETUP' ? !isSetupValid || isBusy : !isUnlockValid || isBusy,
                    onClick: mode === 'SETUP' ? handleSetup : handleUnlock
                }, isBusy ? 'Decrypting...' : (mode === 'SETUP' ? 'INITIALIZE KEYCHAIN BRIDGE' : 'UNLOCK KEYCHAIN BRIDGE'))
            )
        ),

        // Authenticated Worksheets
        mode === 'READY' && h(Fragment, null,
            // Security Leaks Banner
            leakedKeys.length > 0 && h('div', { style: STYLES.leakBox },
                h('div', null,
                    h('div', { style: { color: '#f87171', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' } },
                        h(dc.Icon, { icon: 'alert-triangle', style: { width: 14 } }),
                        'SECURITY THREAT: PLAIN-TEXT LOCALSTORAGE LEAKS'
                    ),
                    h('div', { style: { fontSize: '11px', color: THEME.foregroundMuted, marginTop: '2px' } }, 
                        `${leakedKeys.length} sensitive item(s) found in plain-text storage. A single click will move them to your OS keychain.`
                    )
                ),
                h('button', { style: { ...STYLES.buttonSecondary, background: '#f87171', color: '#fff', border: 'none', fontWeight: '600' }, onClick: handleMigrateAll }, 'MIGRATE ALL TO KEYCHAIN')
            ),

            // Main Columns Grid
            h('div', { style: STYLES.mainGrid },
                // Column 1: Config and Registration
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 0 } },
                    h('div', { style: STYLES.glassCard },
                        h('div', { style: STYLES.cardHeader },
                            h('span', { style: STYLES.cardLabel }, 'Keychain Bridge Commands')
                        ),
                        h('button', { style: STYLES.buttonPrimary(isBusy), disabled: isBusy, onClick: handleBackup }, 'Backup System Keyring to Vault'),
                        h('button', { 
                            style: { ...STYLES.buttonSecondary, marginTop: '4px', width: '100%', padding: '10px' }, 
                            disabled: isBusy || Object.keys(backupPayload).length === 0, 
                            onClick: handleRestore 
                        }, 'Redeploy Backup Secrets to Computer'),
                        
                        h('div', { style: { borderTop: `1px solid ${THEME.border}`, paddingTop: '12px', marginTop: '10px' } },
                            h('div', { style: { color: THEME.foregroundMuted, fontSize: '10px', fontWeight: 'bold', marginBottom: '8px' } }, 'ADD SECRET RECORD'),
                            h('div', { style: STYLES.inputGroup },
                                h('input', {
                                    style: STYLES.input,
                                    placeholder: 'Key Identity (e.g. openai-token)',
                                    value: newKeyName,
                                    onChange: e => setNewKeyName(e.target.value)
                                }),
                                h('input', {
                                    style: STYLES.input,
                                    type: 'password',
                                    placeholder: 'Secret Plaintext Value',
                                    value: newKeyValue,
                                    onChange: e => setNewKeyValue(e.target.value)
                                }),
                                h('button', { 
                                    style: STYLES.buttonPrimary(!newKeyName || !newKeyValue || isBusy), 
                                    disabled: !newKeyName || !newKeyValue || isBusy, 
                                    onClick: handleCreateSecret 
                                }, 'Seal Record to OS Keychain')
                            )
                        )
                    )
                ),

                // Column 2: Computer Keys & Backup Snapshot Explorer
                h('div', { style: STYLES.glassCard },
                    h('div', { style: { display: 'flex', gap: '5px', padding: '4px', background: THEME.backgroundAlt2, borderRadius: '6px', flexShrink: 0 } },
                        h('button', { style: STYLES.tabBtn(registryTab === 'SYSTEM'), onClick: () => setRegistryTab('SYSTEM') }, 'COMPUTER KEYCHAIN'),
                        h('button', { style: STYLES.tabBtn(registryTab === 'BACKUP'), onClick: () => setRegistryTab('BACKUP') }, 'BACKUP SNAPSHOT')
                    ),

                    registryTab === 'BACKUP' && snapshots.length > 0 && h('div', { style: { padding: '8px 10px', background: THEME.backgroundAlt2, borderRadius: '4px', display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 } },
                        h('span', { style: { fontSize: '9px', opacity: 0.6, fontWeight: 'bold' } }, 'SNAPSHOTS:'),
                        h('select', {
                            style: { background: THEME.backgroundAlt, color: THEME.accent, border: `1px solid ${THEME.border}`, fontSize: '10px', flex: 1, padding: '4px' },
                            value: activeSnapshot === 'vault-secrets.bak.enc' ? snapshots[0] : activeSnapshot,
                            onChange: e => syncBackupData(sessionKey, e.target.value.includes('/') ? e.target.value : `${PATHS.archives}/${e.target.value}`)
                        },
                            snapshots.map(f => 
                                h('option', { key: f, value: f }, f.split('bak.').pop().replace('.enc', '').replace(/-/g, ':'))
                            )
                        )
                    ),

                    h('div', { style: STYLES.scroll },
                        (registryTab === 'SYSTEM' ? osKeys : Object.keys(backupPayload)).map(k =>
                            h('div', { key: k, style: STYLES.listItem },
                                h('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 } },
                                    h('span', { style: { fontWeight: '600', fontSize: '13px', color: '#fff', wordBreak: 'break-all' } }, k),
                                    revealedSecret?.id === k && h('div', { style: STYLES.resultPanel },
                                        revealedSecret.loading 
                                            ? h('span', { style: { fontSize: '11px', color: THEME.foregroundMuted } }, 'Decrypting...')
                                            : (revealedSecret.error 
                                                ? h('span', { style: { fontSize: '11px', color: THEME.red } }, `Error: ${revealedSecret.error}`)
                                                : h('div', { style: STYLES.resultCode }, revealedSecret.value))
                                    )
                                ),
                                h('div', { style: { display: 'flex', gap: '8px', flexShrink: 0 } },
                                    h('button', { 
                                        style: STYLES.iconButton, 
                                        onClick: () => {
                                            if (revealedSecret?.id === k) {
                                                setRevealedSecret(null);
                                            } else {
                                                if (registryTab === 'SYSTEM') {
                                                    handleGetSecret(k);
                                                } else {
                                                    setRevealedSecret({ id: k, value: backupPayload[k], loading: false });
                                                }
                                            }
                                        } 
                                    },
                                        h(dc.Icon, { icon: revealedSecret?.id === k ? 'eye-off' : 'eye', style: { width: 14 } })
                                    ),
                                    h('button', { 
                                        style: { ...STYLES.iconButton, color: THEME.red }, 
                                        onClick: () => registryTab === 'SYSTEM' ? handleDeleteSystem(k) : handleDeleteBackup(k) 
                                    },
                                        h(dc.Icon, { icon: 'trash-2', style: { width: 14 } })
                                    )
                                )
                            )
                        ),
                        (registryTab === 'SYSTEM' ? osKeys : Object.keys(backupPayload)).length === 0 && h('div', { style: { padding: '40px', textAlign: 'center', color: THEME.foregroundMuted, fontSize: '12px' } },
                            'No keys found in this section.'
                        )
                    )
                ),

                // Column 3: History log and audit
                h('div', { style: STYLES.glassCard },
                    h('div', { style: STYLES.cardHeader },
                        h('span', { style: STYLES.cardLabel }, 'Activity Audit Trail'),
                        h('button', { 
                            style: { background: 'none', border: 'none', color: THEME.foregroundMuted, cursor: 'pointer', fontSize: '9px' },
                            onClick: () => {
                                setLogs([]);
                                try { dc.app.vault.adapter.remove(PATHS.history); } catch (e) {}
                            }
                        }, 'CLEAR')
                    ),
                    h('div', { style: STYLES.scroll },
                        logs.map((l, i) =>
                            h('div', { key: i, className: 'keychain-bridge-log-item' },
                                h('div', { style: { opacity: 0.4, fontSize: '8px', color: THEME.foregroundMuted } }, new Date(l.time).toLocaleString()),
                                h('div', { style: { color: l.type === 'success' ? THEME.green : (l.type === 'error' ? THEME.red : THEME.foreground), fontSize: '11px', marginTop: '2px' } }, l.msg)
                            )
                        )
                    ),
                    h('div', { style: { marginTop: 'auto', padding: '12px', background: THEME.backgroundAlt2, borderRadius: '6px', border: `1px solid ${THEME.border}`, flexShrink: 0 } },
                        h('div', { style: { fontSize: '13px', fontWeight: 'bold', color: '#fff' } }, `${osKeys.length} System Keys`),
                        h('div', { style: { fontSize: '11px', color: (Object.keys(backupPayload).filter(bk => !osKeys.includes(bk)).length > 0) ? THEME.red : THEME.green, marginTop: '2px' } }, 
                            (Object.keys(backupPayload).filter(bk => !osKeys.includes(bk)).length > 0) ? 'Sync Mismatch: Keys pending backup' : '✓ Secure System Sync'
                        )
                    )
                )
            )
        )
    );
}

return { KeychainBridge: KeychainBridgeApp };
