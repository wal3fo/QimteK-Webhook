/**
 * Webhook Receiver Route
 * 
 * This route captures incoming HTTP requests to webhook endpoints.
 * 
 * Flow:
 * 1. Client generates a webhook URL (e.g., /api/webhook/{token})
 * 2. External services send HTTP requests to this URL
 * 3. This handler captures all request data and stores it
 * 4. Returns success response to the sender
 * 
 * Supports: All HTTP methods (GET, POST, PUT, PATCH, DELETE, etc.)
 */

import { Router, type Request, type Response } from 'express';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ensureDb } from '../db.js';

const router = Router();

// Maximum number of requests to keep per webhook (rolling buffer)
const MAX_REQUESTS_PER_WEBHOOK = 100;

// Maximum body size (10MB)
const MAX_BODY_SIZE = '10mb';

// Middleware to capture raw body for all content types
// Must run before express.json() to preserve raw body data
router.use(express.raw({ type: '*/*', limit: MAX_BODY_SIZE }));

/**
 * Capture webhook request
 * Route: ALL /api/webhook/:token
 * 
 * This endpoint accepts any HTTP method and captures:
 * - Method (GET, POST, PUT, etc.)
 * - Headers (all headers)
 * - Query parameters
 * - Body (raw + parsed JSON when applicable)
 * - Source IP address
 * - Timestamp
 */
router.all('/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const database = await ensureDb();

    // Validate webhook exists and is active
    const webhook = database.prepare('SELECT * FROM webhooks WHERE token = ?').get(token) as any;

    if (!webhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
      return;
    }

    // Check if expired
    if (new Date(webhook.expires_at) < new Date()) {
      res.status(410).json({
        success: false,
        error: 'Webhook expired',
      });
      return;
    }

    // Check if active
    // Handle both boolean (JSON DB) and integer (SQLite) values
    const isActive = typeof webhook.is_active === 'boolean'
      ? webhook.is_active
      : webhook.is_active === 1;

    if (!isActive) {
      res.status(403).json({
        success: false,
        error: 'Webhook is inactive',
      });
      return;
    }

    // Generate unique request ID
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

    // Get raw body (from express.raw() middleware)
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
    } else if (typeof req.body === 'string') {
      rawBody = req.body;
    } else if (req.body) {
      rawBody = String(req.body);
    }

    // Parse body based on content type
    if (rawBody && rawBody.length > 0) {
      if (contentType.includes('application/json')) {
        // Try to parse as JSON
        try {
          body = JSON.parse(rawBody);
        } catch {
          // If JSON parsing fails, store as string
          body = rawBody;
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        // Parse form-encoded data
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
        // Store raw body as string for other content types
        body = rawBody;
      }
    }

    // Extract source IP address (handles proxies/load balancers)
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

      // Enforce request limit: keep only the last N requests per webhook
      // Delete older requests beyond the limit
      // Note: For JSON database, this is handled in the INSERT operation
      // For SQLite, we use a subquery to find and delete old requests
      try {
        const limitStmt = database.prepare(`
          DELETE FROM requests
          WHERE webhook_token = ? 
          AND id NOT IN (
            SELECT id FROM requests
            WHERE webhook_token = ?
            ORDER BY timestamp DESC
            LIMIT ?
          )
        `);

        const limitResult = limitStmt.run(token, token, MAX_REQUESTS_PER_WEBHOOK);
        await (limitResult instanceof Promise ? limitResult : Promise.resolve(limitResult));
      } catch (limitError) {
        // If limit query fails (e.g., JSON database doesn't support subqueries),
        // that's okay - JSON database handles limits during INSERT
        console.log('[Webhook] Request limit enforcement skipped (handled by storage layer)');
      }

      console.log(`[Webhook] Captured ${method} request to ${url} (ID: ${requestId})`);
    } catch (dbError) {
      console.error('Database error saving request:', dbError);
      // Continue anyway - we'll still return success to the sender
    }

    // Return success response to the sender
    // This allows webhook senders to know their request was received
    res.status(200).json({
      success: true,
      message: 'Webhook received',
      requestId,
      timestamp,
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Still return success to avoid retries from webhook senders
    res.status(200).json({
      success: false,
      error: 'Failed to process webhook',
    });
  }
});

export default router;
