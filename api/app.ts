/**
 * Express Application - Minimal Webhook Inspection Service
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import webhookRoutes from './routes/webhooks.js'
import webhookReceiverRoutes from './routes/webhook-receiver.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import visitorRoutes from './routes/visitor.js'
import planRoutes from './routes/plans.js'


// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  dotenv.config()
}

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app: express.Application = express()

// Trust proxy (Vercel, Replit, etc.)
app.set('trust proxy', 1)

// CORS
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true)
    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('replit.app') ||
      origin.includes('repl.co') ||
      origin.includes('vercel.app') ||
      origin === process.env.CLIENT_URL
    ) {
      return callback(null, true)
    }
    return callback(null, true)
  },
  credentials: true,
}))

/**
 * Webhook receiver (must be before body parsers)
 */
app.use('/api/webhook', webhookReceiverRoutes)

// Body parsers
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/visitor', visitorRoutes)
app.use('/api/plans', planRoutes)
app.use('/api/webhooks', webhookRoutes)

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  })
})

// Error handler
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', error)
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Server internal error'
      : error.message,
  })
})

/**
 * 404 handler and Static File Serving
 */
const distPath = path.join(__dirname, '../../dist')
const hasDist = fs.existsSync(path.join(distPath, 'index.html'))

// Serve static files if in production OR if dist exists and we are not in explicit development mode
if (process.env.NODE_ENV === 'production' || (hasDist && process.env.NODE_ENV !== 'development')) {
  console.log(`Serving static files from: ${distPath}`)
  app.use(express.static(distPath))

  app.get('*', (req: Request, res: Response) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({ success: false, error: 'API not found' })
      return
    }
    res.sendFile(path.join(distPath, 'index.html'))
  })
} else {
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'API not found',
    })
  })
}

export default app
