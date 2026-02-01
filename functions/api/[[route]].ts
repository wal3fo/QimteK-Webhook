import serverless from 'serverless-http';
import app from '../../api/app';
import { envContext } from '../../api/lib/context';

// Initialize serverless handler
const handler = serverless(app);

export const onRequest = async (context: any) => {
  // Wrap execution in envContext to make environment variables available 
  // via getEnv() throughout the Express app
  return envContext.run(context.env, async () => {
    // Adapt Cloudflare Request to Node.js Request via serverless-http
    return handler(context.request, context);
  });
};
