import serverless from 'serverless-http';
import app from '../../api/app';
import { envContext } from '../../api/lib/context';

const handler = serverless(app);

export const onRequest = async (context: any) => {
  // Populate the environment context for the Express app
  // This allows getEnv() to work correctly in the shared code
  return envContext.run(context.env, async () => {
    return handler(context.request, context);
  });
};
