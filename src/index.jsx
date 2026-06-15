async function View({ folderPath }) {
    const Agent = {
        timer: null,
        start: (fPath, onReload) => {
            if (Agent.timer) clearInterval(Agent.timer);
            const cmdFile = fPath + '/data/mcp_commands.json';

            Agent.timer = setInterval(async () => {
                try {
                    const adapter = dc.app.vault.adapter;
                    if (!(await adapter.exists(cmdFile))) return;

                    const content = await adapter.read(cmdFile);
                    let cmd;
                    try { cmd = JSON.parse(content); } catch (e) { return; }

                    if (cmd && cmd.executed === false) {
                        const SAFE_ACTIONS = ['reload'];

                        if (SAFE_ACTIONS.includes(cmd.action)) {
                            cmd.executed = true;
                            cmd.result = "Executed by Keychain Bridge Agent";
                            cmd.executedAt = new Date().toISOString();

                            await adapter.write(cmdFile, JSON.stringify(cmd, null, 2));

                            if (cmd.action === 'reload') {
                                onReload();
                            }
                        }
                    }
                } catch (e) { console.error("[SafeAgent] Error", e); }
            }, 1200);
            return () => clearInterval(Agent.timer);
        }
    };

    const SafeView = () => {
        const [app, setApp] = dc.useState(null);
        const [error, setError] = dc.useState(null);
        const [key, setKey] = dc.useState(0);
        const [isFullTab, setIsFullTab] = dc.useState(true);

        const containerRef = dc.useRef(null);
        const stateRefs = dc.useRef({}).current;
        const uniqueWrapperClass = "interactive-wrapper-" + dc.useRef(Math.random().toString(36).substr(2, 9)).current;

        // Code reloader
        dc.useEffect(() => {
            const stopAgent = Agent.start(folderPath, () => {
                if (dc.app.workspace.activeLeaf?.rebuildView) {
                    dc.app.workspace.activeLeaf.rebuildView();
                } else {
                    setKey(k => k + 1);
                }
            });
            return stopAgent;
        }, []);

        // Load ESM Bundle
        dc.useEffect(() => {
            let active = true;
            let cleanup = null;

            const load = async () => {
                try {
                    // Inject global context bridge for the ESM bundle
                    window.dc = dc;

                    // Resolve the bundle path within the Obsidian vault
                    const file = dc.app.vault.getAbstractFileByPath(`${folderPath}/dist/keychain-bridge.es.js`);
                    if (!file) throw new Error("Could not find dist/keychain-bridge.es.js in vault. Please run npm run build.");
                    
                    const url = dc.app.vault.getResourcePath(file);
                    
                    // Dynamically import the compiled module
                    const module = await import(url);
                    if (!active) return;

                    // Execute the native Sovereign Inspector WASM/ESM entrypoint
                    const instanceCleanup = await module.mount_app(containerRef.current, dc, {
                        folderPath: folderPath,
                        isFullTab: isFullTab,
                        onCodeReloadRequest: () => setKey(k => k + 1),
                        onToggleFullTab: () => setIsFullTab(!isFullTab)
                    });
                    if (!active) {
                        if (instanceCleanup) instanceCleanup();
                        return;
                    }
                    cleanup = instanceCleanup;
                    setApp(true);
                    setError(null);
                } catch (e) {
                    console.error("Critical Load Error:", e);
                    if (active) setError(e);
                }
            };
            load();

            return () => {
                active = false;
                if (cleanup) cleanup();
            };
        }, [key]);

        // Helpers for portal reparenting
        const findNearestAncestorWithClass = (element, className) => {
            if (!element) return null;
            let current = element.parentNode;
            while (current) {
                if (current.classList && current.classList.contains(className)) return current;
                current = current.parentNode;
            }
            return null;
        };

        const findDirectChildByClass = (parent, className) => {
            if (!parent) return null;
            for (const child of parent.children) {
                if (child.classList && child.classList.contains(className)) return child;
            }
            return null;
        };

        // Full tab layout portal lifecycle
        dc.useEffect(() => {
            const container = containerRef.current;
            if (!container) return;

            if (isFullTab) {
                if (!container.parentNode) {
                    setTimeout(() => setIsFullTab(true), 50);
                    return;
                }
                const targetPaneContent = findNearestAncestorWithClass(container, 'workspace-leaf-content');
                if (!targetPaneContent) {
                    console.error("[KeychainBridge] Full tab mode failed: Could not find '.workspace-leaf-content' ancestor.");
                    setIsFullTab(false);
                    return;
                }
                const contentWrapper = findDirectChildByClass(targetPaneContent, 'view-content') || targetPaneContent;
                
                stateRefs.originalParent = container.parentNode;
                stateRefs.placeholder = document.createElement('div');
                stateRefs.placeholder.className = "screen-mode-placeholder";
                stateRefs.placeholder.style.display = 'none';
                container.parentNode.insertBefore(stateRefs.placeholder, container);

                contentWrapper.appendChild(container);
                
                stateRefs.parentPositionInfo = {
                    element: contentWrapper,
                    originalInlinePosition: contentWrapper.style.position
                };
                if (window.getComputedStyle(contentWrapper).position === 'static') {
                    contentWrapper.style.position = "relative";
                }

                Object.assign(contentWrapper.style, {
                    padding: "0",
                    margin: "0",
                    height: "100%",
                    width: "100%",
                    display: "block",
                    overflow: "hidden"
                });
                
                Object.assign(container.style, {
                    position: "absolute", top: "0px", left: "0px",
                    width: "100%", height: "100%", zIndex: "9998",
                    overflow: "hidden"
                });

                // Hide Obsidian's view metadata / status bar UI elements (preserving headers)
                const styleId = `full-tab-styles-${uniqueWrapperClass}`;
                let styleEl = document.getElementById(styleId);
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = styleId;
                    styleEl.innerHTML = `
                        .status-bar, .view-footer, .workspace-leaf-content-footer { display: none !important; }
                        .workspace-leaf-content { padding: 0 !important; margin: 0 !important; border-radius: 0 !important; }
                    `;
                    document.head.appendChild(styleEl);
                }
            }

            return () => {
                const styleId = `full-tab-styles-${uniqueWrapperClass}`;
                const styleEl = document.getElementById(styleId);
                if (styleEl) styleEl.remove();

                if (!stateRefs.originalParent) return;
                if (stateRefs.placeholder?.parentNode) {
                    stateRefs.placeholder.parentNode.replaceChild(container, stateRefs.placeholder);
                } else {
                    stateRefs.originalParent.appendChild(container);
                }
                if (stateRefs.parentPositionInfo?.element) {
                    const { element, originalInlinePosition } = stateRefs.parentPositionInfo;
                    element.style.position = originalInlinePosition || '';
                    element.style.padding = '';
                    element.style.margin = '';
                    element.style.height = '';
                    element.style.width = '';
                    element.style.overflow = '';
                }
                container.removeAttribute("style");
                Object.keys(stateRefs).forEach(key => stateRefs[key] = null);
            };
        }, [isFullTab, app]);

        if (error) {
            return (
                <div style={{ padding: '40px', background: '#2d1b1b', color: '#ffaaaa', height: '100%', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>💥</div>
                    <h2 style={{ marginTop: 0, color: '#ff8888' }}>Component Crashed</h2>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', overflow: 'auto', width: '100%', maxWidth: '600px', textAlign: 'left', border: '1px solid #522' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#ffcccc' }}>{error.message}</div>
                        <div style={{ fontSize: '11px', opacity: 0.6 }}>{error.stack}</div>
                    </div>
                </div>
            );
        }

        if (!app) {
            return (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                        Loading Universal Keychain Bridge...
                    </div>
                    <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                </div>
            );
        }

        return (
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        );
    };

    return <SafeView />;
}

return { View };
