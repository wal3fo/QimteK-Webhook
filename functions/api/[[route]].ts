interface LambdaResponse {
  statusCode: number;
  headers?: { [header: string]: boolean | number | string };
  body: string;
  isBase64Encoded: boolean;
}

// Lazy load handler to ensure polyfills run first and prevent startup crashes
let handler: any = null;

export const onRequest = async (context: any) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. Populate process.env with Cloudflare environment variables
  // This must happen before importing the app
  if (env) {
    // Ensure process.env exists
    if (typeof process === 'undefined') {
      (globalThis as any).process = { env: {} };
    } else if (!process.env) {
      (globalThis as any).process.env = {};
    }

    Object.keys(env).forEach(key => {
      try {
        process.env[key] = env[key];
      } catch (e) {
        // Ignore errors if process.env is read-only
      }
    });

    // Explicitly set NODE_ENV if not present
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'production';
    }
  }

  // 2. Initialize handler if not already done
  if (!handler) {
    try {
      console.log('Lazy loading dependencies...');

      // Dynamic import serverless-http
      const serverlessModule = await import('serverless-http');
      const serverless = serverlessModule.default || serverlessModule;

      console.log('Lazy loading app...');
      // Dynamic import the Express app
      const appModule = await import('../../api/app');
      const app = appModule.default;

      // Create the handler
      handler = serverless(app, {
        // Optional: Custom request transformation if needed
        // request: (req: any, event: any, context: any) => { ... }
      });

      console.log('App loaded successfully');
    } catch (e: any) {
      console.error('Failed to load app module:', e);
      return new Response(JSON.stringify({
        success: false,
        error: 'Startup Error',
        details: e.message || String(e),
        stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 3. Prepare the request for serverless-http
  // We need to construct a compatible event object

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
        console.error('Error reading request body:', e);
        body = '';
      }
    } else {
      // Binary data
      try {
        const arrayBuffer = await request.arrayBuffer();
        body = Buffer.from(arrayBuffer).toString('base64');
        isBase64Encoded = true;
      } catch (e) {
        console.error('Error reading binary body:', e);
        body = '';
      }
    }
  }

  const event = {
    httpMethod: request.method,
    path: url.pathname,
    rawPath: url.pathname,
    queryStringParameters: Object.fromEntries(url.searchParams),
    headers: Object.fromEntries(request.headers),
    multiValueHeaders: {},
    body: body,
    isBase64Encoded: isBase64Encoded,
    requestContext: {
      http: {
        method: request.method,
        path: url.pathname,
        protocol: 'HTTP/1.1'
      }
    }
  };

  try {
    // 4. Execute the handler
    const result = (await handler(event, context)) as LambdaResponse;

    // 5. Convert response
    let responseBody: any = result.body;
    if (result.isBase64Encoded) {
      responseBody = Buffer.from(result.body, 'base64');
    }

    return new Response(responseBody, {
      status: result.statusCode,
      headers: result.headers as HeadersInit
    });
  } catch (e: any) {
    console.error('Runtime Error:', e);
    return new Response(JSON.stringify({
      success: false,
      error: 'Runtime Error',
      details: e.message || String(e)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
