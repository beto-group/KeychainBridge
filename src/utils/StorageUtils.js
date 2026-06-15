const { DesktopKeychainProvider } = dc.require("./providers/DesktopKeychainProvider.js");
const { MobileCapacitorProvider } = dc.require("./providers/MobileCapacitorProvider.js");
const { WebFallbackProvider } = dc.require("./providers/WebFallbackProvider.js");

// Determine the environment
const isMobile = window.Capacitor && window.Capacitor.isNative;
// Usually dc.app.secretStorage exists on Desktop
const isDesktop = (typeof dc !== "undefined" && dc?.app?.secretStorage) || (window.app && window.app.secretStorage);

// Initialize the correct provider
let activeProvider = null;

if (isMobile) {
    activeProvider = new MobileCapacitorProvider();
    console.log("[Keychain Bridge] Routing to Mobile Capacitor Keystore.");
} else if (isDesktop) {
    // Note: We expect 'dc' to be available globally or passed in during boot for desktop.
    activeProvider = new DesktopKeychainProvider(typeof dc !== "undefined" ? dc : window);
    console.log("[Keychain Bridge] Routing to Desktop DPAPI/Keychain.");
} else {
    activeProvider = new WebFallbackProvider();
    console.log("[Keychain Bridge] Routing to Web AES-GCM Encrypted Fallback.");
}

/**
 * Universal Storage API for backwards compatibility with existing UI components.
 * Automatically delegates to the active secure enclave provider.
 */
const Storage = {
    provider: activeProvider, // Expose the active provider if the UI needs specific calls (like unlock)
    
    list: async () => {
        return await activeProvider.listSecrets();
    },
    
    get: async (id) => {
        return await activeProvider.getSecret(id);
    },
    
    set: async (id, val) => {
        return await activeProvider.setSecret(id, val);
    },
    
    delete: async (id) => {
        return await activeProvider.deleteSecret(id);
    }
};

return { Storage };
