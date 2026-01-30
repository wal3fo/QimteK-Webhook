import './polyfill';
import serverless from 'serverless-http';
import app from '../../api/app';
import { Buffer } from 'node:buffer';

interface LambdaResponse {
  statusCode: number;
  headers?: { [header: string]: boolean | number | string };
  body: string;
  isBase64Encoded: boolean;
}

const handler = serverless(app);

export const onRequest = async (context: any) => {
  try {
    // Populate process.env with Cloudflare environment variables
    if (context.env) {
      Object.keys(context.env).forEach(key => {
        process.env[key] = context.env[key];
      });
    }

    const request = context.request;
    const url = new URL(request.url);

    // Prepare body
    let body: string | null = null;
    let isBase64Encoded = false;
    const contentType = request.headers.get('content-type') || '';

    // Only read body if method is not GET/HEAD and body exists
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
      if (contentType.includes('application/json') || contentType.includes('text/') || contentType.includes('application/x-www-form-urlencoded')) {
        body = await request.text();
      } else {
        // For binary data, convert to base64
        const arrayBuffer = await request.arrayBuffer();
        body = Buffer.from(arrayBuffer).toString('base64');
        isBase64Encoded = true;
      }
    }

    // Construct a Lambda-compatible event object
    // This avoids "read only property" errors by not passing the native Request object
    const event = {
      httpMethod: request.method,
      path: url.pathname,
      rawPath: url.pathname,
      queryStringParameters: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(request.headers),
      multiValueHeaders: {}, // Some middleware expects this
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

    // Execute the handler with the constructed event
    const result = (await handler(event, context)) as LambdaResponse;

    // Convert Lambda response back to Cloudflare Response
    let responseBody: any = result.body;
    if (result.isBase64Encoded) {
      responseBody = Buffer.from(result.body, 'base64');
    }

    // Ensure headers are strings (serverless-http might return numbers/booleans)
    const headers: Record<string, string> = {};
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        headers[key] = String(value);
      });
    }

    return new Response(responseBody, {
      status: result.statusCode,
      headers: headers
    });
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
