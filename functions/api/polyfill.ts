// Polyfill process for Cloudflare Pages if it doesn't exist
// This prevents crashes in modules that access process.env at the top level
if (typeof globalThis.process === 'undefined') {
    (globalThis as any).process = { env: {} };
} else if (!globalThis.process.env) {
    (globalThis as any).process.env = {};
}

// Ensure process is available globally
if (typeof process === 'undefined') {
    try {
        (globalThis as any).process = (globalThis as any).process || { env: {} };
    } catch (e) {
        // Ignore
    }
}

export {};
