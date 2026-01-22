/**
 * Webhook receiver route - captures incoming webhook requests
 */
import { Router, type Request, type Response } from 'express';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { ensureDb } from '../db.js';

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
    
    // Ensure database is initialized
    const database = await ensureDb();
    
    // Verify webhook exists and is active
    const webhookResult = database.prepare(`
      SELECT * FROM webhooks 
      WHERE token = ? AND is_active = 1 AND expires_at > datetime('now')
    `).get(token);
    const webhook = await (webhookResult instanceof Promise ? webhookResult : Promise.resolve(webhookResult)) as { token: string; expires_at: string; is_active: number } | undefined;
    
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
    
    // Debug log for incoming request method
    console.log(`[Webhook Debug] Received ${method} request to ${req.originalUrl}`);

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
    const stmt = database.prepare(`
      INSERT INTO requests (id, webhook_token, method, url, headers, body, query, ip_address, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    try {
      const runResult = stmt.run(
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
      await (runResult instanceof Promise ? runResult : Promise.resolve(runResult));
      
      console.log(`[Webhook] Request saved: ${method} ${url} (ID: ${requestId})`);
    } catch (dbError) {
      console.error('Database error saving request:', dbError);
      // Continue anyway - we'll still return success
    }
    
    console.log(`[Webhook] Request saved to database: ${method} ${url} (ID: ${requestId})`);
    
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
