import serverless from 'serverless-http';
import app from '../../api/app';
import { envContext } from '../../api/lib/context';

// Initialize serverless handler
const handler = serverless(app);

export const onRequest = async (context: any) => {
  try {
    // Wrap execution in envContext to make environment variables available 
    // via getEnv() throughout the Express app
    return await envContext.run(context.env, async () => {
      // Adapt Cloudflare Request to Node.js Request via serverless-http
      return await handler(context.request, context);
    });
  } catch (err: any) {
    // Catch worker-level exceptions to prevent Error 1101
    console.error('Worker Exception:', err);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Worker Exception',
      message: err.message,
      stack: err.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
