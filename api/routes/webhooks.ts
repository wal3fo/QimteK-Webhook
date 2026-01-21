/**
 * Webhook routes for generating and managing webhooks
 */
import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const router = Router();

/**
 * Generate a new webhook URL
 * POST /api/webhooks/generate
 */
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { expiresIn = 60 } = req.body; // Default 60 minutes
    
    // Generate unique token
    const token = uuidv4().replace(/-/g, '');
    
    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresIn);
    
    // Get base URL from environment or request
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const webhookUrl = `${baseUrl}/api/webhook/${token}`;
    
    // Insert into database
    const stmt = db.prepare(`
      INSERT INTO webhooks (token, expires_at, is_active)
      VALUES (?, ?, 1)
    `);
    
    const result = stmt.run(token, expiresAt.toISOString());
    await (result instanceof Promise ? result : Promise.resolve(result));
    
    res.status(201).json({
      success: true,
      token,
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
 * Get a single request by ID
 * GET /api/webhooks/requests/:id
 * Must come before /:token to avoid route conflicts
 */
router.get('/requests/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const requestResult = db.prepare(`
      SELECT * FROM requests WHERE id = ?
    `).get(id);
    const request = await (requestResult instanceof Promise ? requestResult : Promise.resolve(requestResult)) as {
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
        error: 'Request not found',
      });
      return;
    }
    
    // Parse JSON fields - handle both string and object formats
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
 * Get requests for a specific webhook token
 * GET /api/webhooks/:token/requests
 * This route must come before /:token to avoid route conflicts
 */
router.get('/:token/requests', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    // Verify webhook exists and is active
    const webhookResult = db.prepare(`
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
    
    // Get requests
    const requestsResult = db.prepare(`
      SELECT * FROM requests 
      WHERE webhook_token = ? 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `).all(token, limit, offset);
    const requests = await (requestsResult instanceof Promise ? requestsResult : Promise.resolve(requestsResult)) as Array<{
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
    
    // Get total count
    const totalResult = db.prepare(`
      SELECT COUNT(*) as count FROM requests WHERE webhook_token = ?
    `).get(token);
    const total = await (totalResult instanceof Promise ? totalResult : Promise.resolve(totalResult)) as { count: number };
    
    // Parse JSON fields - handle both string and object formats
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
 */
router.get('/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    
    const webhookResult = db.prepare(`
      SELECT * FROM webhooks 
      WHERE token = ? AND is_active = 1 AND expires_at > datetime('now')
    `).get(token);
    const webhook = await (webhookResult instanceof Promise ? webhookResult : Promise.resolve(webhookResult)) as { token: string; created_at: string; expires_at: string; is_active: number } | undefined;
    
    if (!webhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found or expired',
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
 */
router.delete('/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    
    const stmt = db.prepare('DELETE FROM webhooks WHERE token = ?');
    const result = stmt.run(token);
    await (result instanceof Promise ? result : Promise.resolve(result));
    
    if (result.changes === 0) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found',
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
