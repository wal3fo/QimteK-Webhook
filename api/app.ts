/**
 * Express application
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

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  dotenv.config()
}

const app: express.Application = express()

// Trust proxy - required for correct protocol/IP detection behind load balancers (Vercel, Replit, etc.)
app.set('trust proxy', 1)

// CORS configuration - allow all origins in production (Vercel handles this)
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}))

// Webhook receiver needs raw body, so it must be registered before express.json()
app.use('/api/webhook', webhookReceiverRoutes)

// JSON and URL-encoded body parsers for other routes
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
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

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
