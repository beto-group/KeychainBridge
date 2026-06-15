
import { KeychainBridge } from "KEYCHAIN BRIDGE/src/App.jsx";

export function mount_app(container, dc) {
    // Inject React and ReactDOM into global scope if missing (for preact/compat)
    if (!window.React) window.React = dc.preact;
    if (!window.ReactDOM) window.ReactDOM = dc.preact;

    const { h, render } = dc.preact;
    
    // Render the App into the container
    render(h(KeychainBridge, { 
        folderPath: "KEYCHAIN BRIDGE", 
        isFullTab: true, 
        dc 
    }), container);

    // Return a cleanup function for when the plugin is unloaded
    return () => {
        render(null, container);
    };
}
