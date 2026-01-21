/**
 * Webhook receiver route - captures incoming webhook requests
 */
import { Router, type Request, type Response } from 'express';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const router = Router();

// Middleware to capture raw body
// This needs to run before express.json() processes the body
router.use(express.raw({ type: '*/*', limit: '10mb' }));

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
    let rawBody: string | null = null;
    
    // Get raw body (from express.raw() middleware) and convert to string
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
    } else if (typeof req.body === 'string') {
      rawBody = req.body;
    } else if (req.body) {
      // Fallback: convert to string if it's something else
      rawBody = String(req.body);
    }
    
    if (rawBody && rawBody.length > 0) {
      // Try to parse as JSON if content-type suggests it
      if (contentType.includes('application/json')) {
        try {
          body = JSON.parse(rawBody);
        } catch {
          // If JSON parsing fails, store as string
          body = rawBody;
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        // Try to parse form data
        try {
          const params = new URLSearchParams(rawBody);
          const formData: Record<string, string> = {};
          params.forEach((value, key) => {
            formData[key] = value;
          });
          body = Object.keys(formData).length > 0 ? formData : rawBody;
        } catch {
          body = rawBody;
        }
      } else {
        // Store raw body as string
        body = rawBody;
      }
    }
    
    // Get IP address
    const ipAddress = 
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown';
    
    // Store request in database
    const timestamp = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO requests (id, webhook_token, method, url, headers, body, query, ip_address, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    try {
      stmt.run(
        requestId,
        token,
        method,
        url,
        JSON.stringify(headers),
        body ? JSON.stringify(body) : null,
        Object.keys(query).length > 0 ? JSON.stringify(query) : null,
        ipAddress,
        timestamp
      );
      
      console.log(`[Webhook] Request saved: ${method} ${url} (ID: ${requestId})`);
    } catch (dbError) {
      console.error('Database error saving request:', dbError);
      // Continue anyway - we'll still return success
    }
    
    // Prepare request object for socket emission
    const requestData = {
      id: requestId,
      webhook_token: token,
      method,
      url,
      headers,
      body,
      query,
      timestamp,
      ip_address: ipAddress,
    };
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`webhook:${token}`).emit('new-request', requestData);
      console.log(`[Webhook] Socket event emitted for token: ${token}`);
    } else {
      console.warn('[Webhook] Socket.io not available');
    }
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Webhook received',
      requestId,
      timestamp,
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
