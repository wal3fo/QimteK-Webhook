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

    return await handler(context.request, context);
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
