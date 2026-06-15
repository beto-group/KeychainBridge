
import { KeychainBridge } from "KEYCHAIN BRIDGE/src/App.jsx";

export { KeychainBridge };

export function mount_app(container, dc, options = {}) {
    // Inject React and ReactDOM into global scope if missing (for preact/compat)
    if (!window.React) window.React = dc.preact;
    if (!window.ReactDOM) window.ReactDOM = dc.preact;

    const { h, render } = dc.preact;
    
    const props = {
        folderPath: options.folderPath || "KEYCHAIN BRIDGE",
        isFullTab: options.isFullTab !== undefined ? options.isFullTab : true,
        onCodeReloadRequest: options.onCodeReloadRequest || (() => {}),
        onToggleFullTab: options.onToggleFullTab || (() => {}),
        dc
    };

    // Render the App into the container
    render(h(KeychainBridge, props), container);

    // Return a cleanup function for when the plugin is unloaded
    return () => {
        render(null, container);
    };
}
