
/**
 * API Configuration
 * 
 * Helper to determine the correct API URL based on environment.
 * This is crucial for avoiding mixed content errors and ensuring
 * the frontend connects to the correct backend in production.
 */

export const getApiUrl = (): string => {
  // 1. Get URL from environment variables
  const envUrl = import.meta.env.VITE_API_URL;

  // 2. Default to relative path if not set
  if (!envUrl) return '/api';

  // 3. Safety check: If we are in PRODUCTION and the URL is localhost,
  // ignore it and use relative path. This handles cases where
  // local .env files might accidentally leak into production builds
  // or Replit/Vercel secrets are misconfigured.
  if (envUrl.includes('localhost') && import.meta.env.PROD) {
    console.warn('API URL is localhost but running in production. Falling back to relative path /api');
    return '/api';
  }

  // 4. Return configured URL
  return envUrl;
};

export const API_URL = getApiUrl();
