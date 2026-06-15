import { DesktopKeychainProvider } from "./providers/DesktopKeychainProvider.js";
import { MobileCapacitorProvider } from "./providers/MobileCapacitorProvider.js";
import { WebFallbackProvider } from "./providers/WebFallbackProvider.js";

// Determine the environment dynamically
const isMobile = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNative;
const isDesktop = typeof dc !== "undefined" && dc?.app?.secretStorage;

let activeProvider = null;

if (isMobile) {
    activeProvider = new MobileCapacitorProvider();
} else if (isDesktop) {
    activeProvider = new DesktopKeychainProvider(typeof dc !== "undefined" ? dc : window);
} else {
    activeProvider = new WebFallbackProvider();
}

/**
 * Universal Storage API for backwards compatibility with existing UI components.
 */
export const Storage = {
    provider: activeProvider, 
    list: async () => await activeProvider.listSecrets(),
    get: async (id) => await activeProvider.getSecret(id),
    set: async (id, val) => await activeProvider.setSecret(id, val),
    delete: async (id) => await activeProvider.deleteSecret(id)
};
