/**
 * Webhook Management Routes
 * 
 * These routes handle webhook lifecycle:
 * 1. Generate new webhook URLs
 * 2. Retrieve captured requests for a webhook
 * 3. Get individual request details
 * 4. Delete webhooks
 * 
 * All webhook data is stored in-memory (JSON) or SQLite database.
 */

import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ensureDb } from '../db.js';
import { authenticate } from '../utils/auth.js';
import { WEBHOOK_LIMITS } from '../config.js';

const router = Router();

/**
 * Generate a new webhook URL
 * POST /api/webhooks/generate
 * 
 * Creates a unique, hard-to-guess webhook endpoint.
 * Each webhook has an expiration time (default: 60 minutes).
 * Webhooks are linked to the authenticated user.
 * 
 * Requires: Authentication
 * Returns: { token, url, expiresAt }
 */
router.post('/generate', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    // Default expiration: 60 minutes
    const { expiresIn = 60, name } = req.body;

    const database = await ensureDb();

    // Check webhook limits
    console.log(`Checking limits for user ${user.id} (${user.role})`);
    const countResult = database.prepare(`
      SELECT COUNT(*) as count 
      FROM webhooks 
      WHERE user_id = ? AND is_active = 1 AND expires_at > datetime('now')
    `).get(user.id);

    console.log('Count result:', countResult);

    if (!countResult) {
      console.error('Count query returned no result (undefined)');
      throw new Error('Database query failed to return count');
    }

    const currentCount = (countResult as any).count;
    console.log(`Current count: ${currentCount}`);

    let limit = WEBHOOK_LIMITS.USER;
    if (user.role === 'Administrator') limit = WEBHOOK_LIMITS.ADMIN;
    else if (user.role === 'Professional') limit = WEBHOOK_LIMITS.PROFESSIONAL;

    if (currentCount >= limit) {
      res.status(403).json({
        success: false,
        error: `Webhook limit reached. You can only have ${limit} active webhook(s).`,
      });
      return;
    }

    // Generate unique token (UUID without dashes for shorter URL)
    const token = uuidv4().replace(/-/g, '');

    // Calculate expiration time
    const expiresAt = new Date();

    // Policy: Administrator and Professional have valid lifetime (100 years),
    // Users have fixed 24h expiration
    if (user.role === 'Administrator' || user.role === 'Professional') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 100);
    } else {
      expiresAt.setHours(expiresAt.getHours() + 24);
    }

    // Build webhook URL
    // Handles both local development and production (behind proxy)
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
    const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
    const webhookUrl = `${baseUrl}/api/webhook/${token}`;

    // Store webhook in database (linked to user)
    const stmt = database.prepare(`
      INSERT INTO webhooks (token, user_id, name, expires_at, is_active)
      VALUES (?, ?, ?, ?, 1)
    `);

    const result = stmt.run(token, user.id, name || null, expiresAt.toISOString());
    await (result instanceof Promise ? result : Promise.resolve(result));

    res.status(201).json({
      success: true,
      token,
      name,
      url: webhookUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error generating webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate webhook',
    });
  }
});

/**
 * List all webhooks for the authenticated user
 * GET /api/webhooks
 * 
 * Returns all webhooks belonging to the current user.
 * 
 * Requires: Authentication
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const database = await ensureDb();

    // Get all webhooks for this user
    const webhooksResult = database.prepare(`
      SELECT token, name, created_at, expires_at, is_active
      FROM webhooks 
      WHERE user_id = ? AND is_active = 1 AND expires_at > datetime('now')
      ORDER BY created_at DESC
    `).all(user.id);

    const webhooks = await (webhooksResult instanceof Promise
      ? webhooksResult
      : Promise.resolve(webhooksResult)) as Array<{
        token: string;
        name?: string;
        created_at: string;
        expires_at: string;
        is_active: number;
      }>;

    // Build URLs for each webhook
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
    const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;

    const webhooksWithUrls = webhooks.map(wh => ({
      token: wh.token,
      name: wh.name,
      url: `${baseUrl}/api/webhook/${wh.token}`,
      createdAt: wh.created_at,
      expiresAt: wh.expires_at,
      isActive: wh.is_active === 1,
    }));

    res.json({
      success: true,
      webhooks: webhooksWithUrls,
    });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhooks',
    });
  }
});

/**
 * Get a single request by ID
 * GET /api/webhooks/requests/:id
 * 
 * Returns full request details including headers, body, query params.
 * Used by UI to display request details when user clicks on a request.
 * Only returns requests for webhooks owned by the authenticated user.
 * 
 * Requires: Authentication
 */
router.get('/requests/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const database = await ensureDb();

    // Get request and verify it belongs to a webhook owned by the user
    const requestResult = database.prepare(`
      SELECT r.* FROM requests r
      INNER JOIN webhooks w ON r.webhook_token = w.token
      WHERE r.id = ? AND w.user_id = ?
    `).get(id, user.id);

    const request = await (requestResult instanceof Promise
      ? requestResult
      : Promise.resolve(requestResult)) as {
        id: string;
        webhook_token: string;
        method: string;
        url: string;
        headers: string;
        body: string | null;
        query: string | null;
        timestamp: string;
        ip_address: string | null;
      } | undefined;

    if (!request) {
      res.status(404).json({
        success: false,
        error: 'Request not found or access denied',
      });
      return;
    }

    // Parse JSON fields (headers, body, query are stored as JSON strings)
    const parseJsonField = (field: string | object | null): any => {
      if (!field) return null;
      if (typeof field === 'object') return field;
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return field;
        }
      }
      return field;
    };

    res.json({
      success: true,
      request: {
        id: request.id,
        webhook_token: request.webhook_token,
        method: request.method,
        url: request.url,
        headers: parseJsonField(request.headers),
        body: parseJsonField(request.body),
        query: parseJsonField(request.query),
        timestamp: request.timestamp,
        ip_address: request.ip_address,
      },
    });
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch request',
    });
  }
});

/**
 * Get all requests for a webhook
 * GET /api/webhooks/:token/requests
 * 
 * Returns list of captured requests for a webhook, sorted newest first.
 * Used by UI to display the request list.
 * 
 * Query params:
 * - limit: Max number of requests to return (default: 100)
 * - offset: Pagination offset (default: 0)
 */
router.get('/:token/requests', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const database = await ensureDb();

    // Verify webhook exists and is active
    const webhookResult = database.prepare(`
      SELECT * FROM webhooks 
      WHERE token = ? AND is_active = 1 AND expires_at > datetime('now')
    `).get(token);

    const webhook = await (webhookResult instanceof Promise
      ? webhookResult
      : Promise.resolve(webhookResult)) as { token: string; expires_at: string; is_active: number } | undefined;

    if (!webhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found, expired, or access denied',
      });
      return;
    }

    // Get requests, sorted newest first
    const requestsResult = database.prepare(`
      SELECT * FROM requests 
      WHERE webhook_token = ? 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `).all(token, limit, offset);

    const requests = await (requestsResult instanceof Promise
      ? requestsResult
      : Promise.resolve(requestsResult)) as Array<{
        id: string;
        webhook_token: string;
        method: string;
        url: string;
        headers: string;
        body: string | null;
        query: string | null;
        timestamp: string;
        ip_address: string | null;
      }>;

    // Get total count for pagination
    const totalResult = database.prepare(`
      SELECT COUNT(*) as count FROM requests WHERE webhook_token = ?
    `).get(token);
    const total = await (totalResult instanceof Promise
      ? totalResult
      : Promise.resolve(totalResult)) as { count: number };

    // Parse JSON fields
    const parseJsonField = (field: string | object | null): any => {
      if (!field) return null;
      if (typeof field === 'object') return field;
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return field;
        }
      }
      return field;
    };

    const parsedRequests = requests.map(req => ({
      id: req.id,
      webhook_token: req.webhook_token,
      method: req.method,
      url: req.url,
      headers: parseJsonField(req.headers),
      body: parseJsonField(req.body),
      query: parseJsonField(req.query),
      timestamp: req.timestamp,
      ip_address: req.ip_address,
    }));

    res.json({
      success: true,
      requests: parsedRequests,
      total: total.count,
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch requests',
    });
  }
});

/**
 * Get webhook info
 * GET /api/webhooks/:token
 * 
 * Returns basic webhook metadata (token, expiration, active status).
 * Only returns webhooks owned by the authenticated user.
 * 
 * Requires: Authentication
 */
router.get('/:token', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { token } = req.params;
    const database = await ensureDb();

    const webhookResult = database.prepare(`
      SELECT * FROM webhooks 
      WHERE token = ? AND user_id = ? AND is_active = 1 AND expires_at > datetime('now')
    `).get(token, user.id);

    const webhook = await (webhookResult instanceof Promise
      ? webhookResult
      : Promise.resolve(webhookResult)) as {
        token: string;
        created_at: string;
        expires_at: string;
        is_active: number
      } | undefined;

    if (!webhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found, expired, or access denied',
      });
      return;
    }

    res.json({
      success: true,
      webhook: {
        token: webhook.token,
        created_at: webhook.created_at,
        expires_at: webhook.expires_at,
        is_active: webhook.is_active === 1,
      },
    });
  } catch (error) {
    console.error('Error fetching webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook',
    });
  }
});

/**
 * Delete a webhook and all its requests
 * DELETE /api/webhooks/:token
 * 
 * Permanently removes the webhook and all associated request data.
 * Only allows deletion of webhooks owned by the authenticated user.
 * 
 * Requires: Authentication
 */
router.delete('/:token', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { token } = req.params;
    const database = await ensureDb();

    // Only delete if webhook belongs to the user
    const stmt = database.prepare('DELETE FROM webhooks WHERE token = ? AND user_id = ?');
    const result = stmt.run(token, user.id);
    const finalResult = await (result instanceof Promise ? result : result);

    if (finalResult.changes === 0) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found or access denied',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete webhook',
    });
  }
});

export default router;
