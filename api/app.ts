/**
 * Express application for Vercel serverless functions
 * 
 * This app is exported as a handler for Vercel serverless functions.
 * It does NOT start a server - Vercel handles that automatically.
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
import authRoutes from './routes/auth.js'
import webhookRoutes from './routes/webhooks.js'
import webhookReceiverRoutes from './routes/webhook-receiver.js'

// Load environment variables (only in local dev, Vercel provides them automatically)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  dotenv.config()
}

const app: express.Application = express()

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
app.use('/api/auth', authRoutes)
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
    vercel: !!process.env.VERCEL,
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
