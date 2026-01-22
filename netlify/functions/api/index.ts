/**
 * Netlify function handler for API routes
 */
import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import serverless from 'serverless-http';
import app from '../../../api/app.js';
import { initDb } from '../../../api/db.js';

// Initialize database on first request (serverless functions are stateless)
let dbInitialized = false;
const initPromise = initDb().then(() => {
  dbInitialized = true;
  console.log('Database initialized for Netlify function');
}).catch((err) => {
  console.error('Failed to initialize database:', err);
});

// Wrap Express app with serverless-http
const serverlessApp = serverless(app, {
  binary: ['image/*', 'application/pdf', 'application/octet-stream'],
});

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Ensure database is initialized before handling request
  if (!dbInitialized) {
    await initPromise;
  }

  // Netlify functions timeout after a certain time, so we need to ensure
  // the context doesn't get closed before the response
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const result = await serverlessApp(event, context);
    return result;
  } catch (error) {
    console.error('Error in Netlify function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
};
