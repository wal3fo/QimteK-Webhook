import { AsyncLocalStorage } from 'node:async_hooks';

// Define the shape of our environment
interface EnvContext {
  [key: string]: string | undefined;
}

// Create a storage instance
export const envContext = new AsyncLocalStorage<EnvContext>();

// Helper to get environment variables safely
export function getEnv(key: string, defaultValue: string = ''): string {
  // 1. Try to get from AsyncLocalStorage (Cloudflare Request Context)
  const store = envContext.getStore();
  if (store && store[key]) {
    return store[key] as string;
  }

  // 2. Try process.env (Node.js fallback / Local Dev)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }

  // 3. Return default
  return defaultValue;
}
