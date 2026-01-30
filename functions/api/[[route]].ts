import './polyfill';
import serverless from 'serverless-http';
import app from '../../api/app';

const handler = serverless(app);

export const onRequest = async (context: any) => {
  try {
    // Populate process.env with Cloudflare environment variables
    if (context.env) {
      Object.keys(context.env).forEach(key => {
        process.env[key] = context.env[key];
      });
    }

    // Workaround: Cloudflare Request object has a read-only 'body' property.
    // serverless-http tries to modify it during cleanup, causing a crash.
    // We wrap the request in a Proxy to intercept and ignore writes to 'body'.
    const reqProxy = new Proxy(context.request, {
      set(target, prop, value, receiver) {
        if (prop === 'body') {
          // Ignore writes to 'body' to prevent "Cannot assign to read only property" error
          return true;
        }
        return Reflect.set(target, prop, value, receiver);
      }
    });

    return await handler(reqProxy, context);
  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      details: error.message || String(error),
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
