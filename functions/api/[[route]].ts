import serverless from 'serverless-http';
import app from '../../api/app';

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
