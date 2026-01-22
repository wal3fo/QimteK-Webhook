/**
 * Netlify function handler for API routes
 */
import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import serverless from 'serverless-http';
import app from '../../../api/app.js';
import { initDb } from '../../../api/db.js';

// Initialize database on first request (serverless functions are stateless)
let dbInitialized = false;
let dbInitError: Error | null = null;
const initPromise = initDb().then(() => {
  dbInitialized = true;
  console.log('✅ Database initialized for Netlify function');
  console.log('Database path:', process.env.DB_PATH || '/tmp/webhook-data.json');
}).catch((err) => {
  dbInitError = err instanceof Error ? err : new Error(String(err));
  console.error('❌ Failed to initialize database:', err);
          console.error('Error details:', {
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            dbPath: process.env.DB_PATH || '/tmp/webhook-data.json',
            cwd: process.cwd(),
            netlify: !!process.env.NETLIFY,
          });
});

// Wrap Express app with serverless-http
const serverlessApp = serverless(app, {
  binary: ['image/*', 'application/pdf', 'application/octet-stream'],
});

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Netlify functions timeout after a certain time, so we need to ensure
  // the context doesn't get closed before the response
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Ensure database is initialized before handling request
    if (!dbInitialized) {
      try {
        await initPromise;
        if (!dbInitialized) {
          throw new Error('Database initialization failed');
        }
      } catch (dbError) {
        const error = dbError instanceof Error ? dbError : new Error(String(dbError));
        console.error('Database initialization error:', error);
        console.error('Error stack:', error.stack);
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: 'Database initialization failed',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            dbPath: process.env.DB_PATH || '/tmp/webhook-data.json',
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        };
      }
      
      // Check if there was a previous initialization error
      if (dbInitError) {
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: 'Database initialization failed',
            details: dbInitError.message,
            stack: process.env.NODE_ENV === 'development' ? dbInitError.stack : undefined,
            dbPath: process.env.DB_PATH || '/tmp/webhook-data.json',
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        };
      }
    }

    // Netlify redirects /api/* to /.netlify/functions/api/:splat
    // The event.path will be the original path (/api/webhooks/generate)
    // serverless-http will handle the path correctly
    
    // Log for debugging
    console.log('Netlify function called:', {
      path: event.path,
      rawPath: event.rawPath,
      rawUrl: event.rawUrl,
      httpMethod: event.httpMethod,
      cwd: process.cwd(),
      netlify: !!process.env.NETLIFY,
    });
    
    const result = await serverlessApp(event, context);
    return result;
  } catch (error) {
    console.error('Error in Netlify function:', error);
    console.error('Event:', {
      path: event.path,
      rawPath: event.rawPath,
      rawUrl: event.rawUrl,
      httpMethod: event.httpMethod,
    });
    
    // Ensure we return a proper Netlify function response
    if (error && typeof error === 'object' && 'statusCode' in error) {
      return error as any;
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
};
