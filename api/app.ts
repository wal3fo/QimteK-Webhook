/**
 * Express Application - Minimal Webhook Inspection Service
 * 
 * This application provides a lightweight webhook inspection service similar to webhook.site.
 * 
 * Core Flow:
 * 1. User generates a unique webhook URL via POST /api/webhooks/generate
 * 2. External services send HTTP requests to the webhook URL (/api/webhook/{token})
 * 3. All request data (method, headers, body, query, IP, timestamp) is captured and stored
 * 4. User can view captured requests via GET /api/webhooks/{token}/requests
 * 5. User can view individual request details via GET /api/webhooks/requests/{id}
 * 
 * Storage:
 * - Uses in-memory JSON file or SQLite database (auto-detected)
 * - Each webhook keeps a rolling buffer of last 100 requests (older requests are deleted)
 * - Webhooks expire after a set time (default: 60 minutes)
 * 
 * For local development, use api/server.ts which wraps this app.
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import webhookRoutes from './routes/webhooks.js'
import webhookReceiverRoutes from './routes/webhook-receiver.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  dotenv.config()
}

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app: express.Application = express()

// Static files for frontend - try current dir first, then parent
const distPath = path.join(__dirname, 'dist');
const distPathParent = path.join(__dirname, '../dist');

// Serve static files from wherever dist exists
app.use(express.static(distPath));
app.use(express.static(distPathParent));

// Trust proxy - required for correct protocol/IP detection behind load balancers (Vercel, Replit, etc.)
app.set('trust proxy', 1)

// CORS configuration - allow all origins in production (Vercel handles this)
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}))

/**
 * Webhook Receiver Route
 * 
 * This route MUST be registered before express.json() middleware because it needs
 * access to the raw request body for all content types (not just JSON).
 * 
 * Route: /api/webhook/:token
 * Handles: ALL HTTP methods (GET, POST, PUT, PATCH, DELETE, etc.)
 */
app.use('/api/webhook', webhookReceiverRoutes)

// JSON and URL-encoded body parsers for other routes (webhook management API)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * Authentication Routes
 * 
 * Routes for user authentication:
 * - POST /api/auth/register - Register new user
 * - POST /api/auth/login - Login user
 * - GET /api/auth/me - Get current user (requires auth)
 */
app.use('/api/auth', authRoutes)

/**
 * User Management Routes (Admin Only)
 */
app.use('/api/users', userRoutes)

/**
 * Webhook Management Routes
 * 
 * Routes for generating webhooks and retrieving captured requests:
 * - POST /api/webhooks/generate - Create new webhook
 * - GET /api/webhooks/:token/requests - List requests for a webhook
 * - GET /api/webhooks/requests/:id - Get single request details
 * - DELETE /api/webhooks/:token - Delete webhook
 */
app.use('/api/webhooks', webhookRoutes)

/**
 * Health check endpoint
 * GET /api/health
 * 
 * Used to verify the serverless function is running.
 * Also useful for keeping functions warm (ping every 5 minutes).
 */
app.get('/api/health', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })
})

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Server internal error'
      : error.message,
  })
})

// 404 handler for API
app.use('/api', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

// Serve frontend for all other routes
app.get('*', (req: Request, res: Response) => {
  const indexPath = path.join(__dirname, 'index.html');
  const indexPathParent = path.join(__dirname, '../dist/index.html');
  
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else if (require('fs').existsSync(indexPathParent)) {
    res.sendFile(indexPathParent);
  } else {
    res.status(404).json({ success: false, error: 'Frontend not found' });
  }
})

export default app
