export const CryptoUtils = {
    deriveKey: async (passphrase, salt) => {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw", 
            enc.encode(passphrase), 
            { name: "PBKDF2" }, 
            false, 
            ["deriveBits", "deriveKey"]
        );
        return window.crypto.subtle.deriveKey(
            { 
                name: "PBKDF2", 
                salt, 
                iterations: 100000, 
                hash: "SHA-256" 
            }, 
            keyMaterial, 
            { name: "AES-GCM", length: 256 }, 
            true, 
            ["encrypt", "decrypt"]
        );
    },

    encrypt: async (data, passphrase) => {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const key = await Crypto.deriveKey(passphrase, salt);
        const encoded = new TextEncoder().encode(JSON.stringify(data));
        const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
        
        const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        combined.set(salt, 0); 
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(encrypted), salt.length + iv.length);
        
        return btoa(String.fromCharCode.apply(null, combined));
    },

    decrypt: async (encryptedBase64, passphrase) => {
        try {
            const combined = new Uint8Array(atob(encryptedBase64).split("").map(c => c.charCodeAt(0)));
            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const encrypted = combined.slice(28);
            
            const key = await Crypto.deriveKey(passphrase, salt);
            const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
            return JSON.parse(new TextDecoder().decode(decrypted));
        } catch (e) { 
            throw new Error("Incorrect Password."); 
        }
    }
};
