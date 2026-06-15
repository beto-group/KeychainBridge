const Crypto = {
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
                salt: enc.encode(salt),
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
        const key = await Crypto.deriveKey(passphrase, "datacore_salt_static");
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const enc = new TextEncoder();
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            enc.encode(JSON.stringify(data))
        );
        const buf = new Uint8Array(encrypted);
        const combined = new Uint8Array(iv.length + buf.length);
        combined.set(iv);
        combined.set(buf, iv.length);
        return btoa(String.fromCharCode.apply(null, combined));
    },

    decrypt: async (encryptedBase64, passphrase) => {
        const key = await Crypto.deriveKey(passphrase, "datacore_salt_static");
        const combined = new Uint8Array(atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));
        const iv = combined.slice(0, 12);
        const data = combined.slice(12);
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            data
        );
        const dec = new TextDecoder();
        return JSON.parse(dec.decode(decrypted));
    },

    encryptString: async (str, key) => {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const enc = new TextEncoder();
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            enc.encode(str)
        );
        const buf = new Uint8Array(encrypted);
        const combined = new Uint8Array(iv.length + buf.length);
        combined.set(iv);
        combined.set(buf, iv.length);
        return btoa(String.fromCharCode.apply(null, combined));
    },

    decryptString: async (encryptedBase64, key) => {
        const combined = new Uint8Array(atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));
        const iv = combined.slice(0, 12);
        const data = combined.slice(12);
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            data
        );
        const dec = new TextDecoder();
        return dec.decode(decrypted);
    }
};

export { Crypto  };