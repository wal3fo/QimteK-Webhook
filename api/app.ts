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
