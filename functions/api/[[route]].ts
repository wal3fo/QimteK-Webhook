import serverless from 'serverless-http';
import app from '../../api/app';

const handler = serverless(app);

export const onRequest = async (context: any) => {
  return handler(context.request, context);
};
