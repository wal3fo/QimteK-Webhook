// Polyfill process for Cloudflare Pages if it doesn't exist
// This prevents crashes in modules that access process.env at the top level
if (typeof process === 'undefined') {
    (globalThis as any).process = { env: {} };
} else if (!process.env) {
    (globalThis as any).process.env = {};
}

export {};
