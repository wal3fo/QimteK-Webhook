import { envContext } from '../../api/lib/context';

interface LambdaResponse {
  statusCode: number;
  headers?: { [header: string]: boolean | number | string };
  body: string;
  isBase64Encoded: boolean;
}

// Lazy load handler
let handler: any = null;

export const onRequest = async (context: any) => {
  const { request, env } = context;

  // Run everything within the AsyncLocalStorage context
  return envContext.run(env || {}, async () => {
    // Initialize handler if not already done
    if (!handler) {
      try {
        // Dynamic import serverless-http
        const serverlessModule = await import('serverless-http');
        const serverless = serverlessModule.default || serverlessModule;

        // Dynamic import the Express app
        const appModule = await import('../../api/app');
        const app = appModule.default;

        // Create the handler
        handler = serverless(app);
      } catch (e: any) {
        console.error('Failed to load app module:', e);
        return new Response(JSON.stringify({
          success: false,
          error: 'Startup Error',
          details: e.message || String(e)
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Construct a compatible event object for serverless-http
    let body: string | null = null;
    let isBase64Encoded = false;
    const contentType = request.headers.get('content-type') || '';

    if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
      if (contentType.includes('application/json') ||
        contentType.includes('text/') ||
        contentType.includes('application/x-www-form-urlencoded')) {
        try {
          body = await request.text();
        } catch (e) {
          body = '';
        }
      } else {
        // Binary data
        try {
          const arrayBuffer = await request.arrayBuffer();
          body = Buffer.from(arrayBuffer).toString('base64');
          isBase64Encoded = true;
        } catch (e) {
          body = '';
        }
      }
    }

    const event = {
      httpMethod: request.method,
      path: new URL(request.url).pathname,
      headers: Object.fromEntries(request.headers),
      queryStringParameters: Object.fromEntries(new URL(request.url).searchParams),
      body,
      isBase64Encoded,
    };

    // Execute the handler
    try {
      const result: LambdaResponse = await handler(event, {
        ...context,
        // Pass env explicitly in context if needed by some middlewares
        env
      });

      return new Response(result.body, {
        status: result.statusCode,
        headers: result.headers as any,
      });
    } catch (e: any) {
      console.error('Handler execution error:', e);
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        details: e.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });
};
