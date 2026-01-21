/**
 * Webhook receiver route - captures incoming webhook requests
 */
import { Router, type Request, type Response } from 'express';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const router = Router();

// Use raw body parser for webhook receiver only
router.use(express.text({ type: '*/*', limit: '10mb' }));

/**
 * Capture webhook request
 * ALL /api/webhook/:token
 */
router.all('/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    
    // Verify webhook exists and is active
    const webhook = db.prepare(`
      SELECT * FROM webhooks 
      WHERE token = ? AND is_active = 1 AND expires_at > datetime('now')
    `).get(token) as { token: string; expires_at: string; is_active: number } | undefined;
    
    if (!webhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found or expired',
      });
      return;
    }
    
    // Generate request ID
    const requestId = uuidv4();
    
    // Extract request data
    const method = req.method;
    const url = req.originalUrl;
    const headers = req.headers;
    const query = req.query;
    
    // Parse body - handle different content types
    let body = null;
    const contentType = req.headers['content-type'] || '';
    
    if (req.body) {
      if (typeof req.body === 'string' && req.body.length > 0) {
        // Try to parse as JSON if content-type suggests it
        if (contentType.includes('application/json')) {
          try {
            body = JSON.parse(req.body);
          } catch {
            // If JSON parsing fails, store as string
            body = req.body;
          }
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          // Form data is already parsed by express.urlencoded
          body = req.body;
        } else {
          // Store raw body as string
          body = req.body;
        }
      } else if (typeof req.body === 'object' && !Array.isArray(req.body) && Object.keys(req.body).length > 0) {
        // Already parsed object (from express.json or express.urlencoded)
        body = req.body;
      } else if (Buffer.isBuffer(req.body)) {
        // Buffer - convert to string
        body = req.body.toString('utf8');
      }
    }
    
    // Get IP address
    const ipAddress = 
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown';
    
    // Store request in database
    const stmt = db.prepare(`
      INSERT INTO requests (id, webhook_token, method, url, headers, body, query, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      requestId,
      token,
      method,
      url,
      JSON.stringify(headers),
      body ? JSON.stringify(body) : null,
      Object.keys(query).length > 0 ? JSON.stringify(query) : null,
      ipAddress
    );
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`webhook:${token}`).emit('new-request', {
        id: requestId,
        webhook_token: token,
        method,
        url,
        headers,
        body,
        query,
        timestamp: new Date().toISOString(),
        ip_address: ipAddress,
      });
    }
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Webhook received',
      requestId,
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
    });
  }
});

export default router;
