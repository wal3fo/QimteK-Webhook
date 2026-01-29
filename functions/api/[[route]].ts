import serverless from 'serverless-http';
import app from '../../api/app';

// Polyfill process for Cloudflare Pages if it doesn't exist
// This prevents crashes in modules that access process.env at the top level
if (typeof process === 'undefined') {
  (globalThis as any).process = { env: {} };
} else if (!process.env) {
  process.env = {};
}

const handler = serverless(app);

export const onRequest = async (context: any) => {
  // Populate process.env with Cloudflare environment variables
  if (context.env) {
    Object.keys(context.env).forEach(key => {
      process.env[key] = context.env[key];
    });
  }

  return handler(context.request, context);
};
