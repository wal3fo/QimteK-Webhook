/**
 * Webhook Management Routes
 * 
 * These routes handle webhook lifecycle:
 * 1. Generate new webhook URLs
 * 2. Retrieve captured requests for a webhook
 * 3. Get individual request details
 * 4. Delete webhooks
 * 
 * All webhook data is stored in Supabase (PostgreSQL).
 */

import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase.js';
import { authenticate } from '../utils/auth.js';
import { getPlans, type PlanConfig } from '../utils/plan-storage.js';

const router = Router();

/**
 * Generate a new webhook URL
 * POST /api/webhooks/generate
 */
router.post('/generate', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    // Default expiration: 60 minutes
    const { expiresIn = 60, name, alias } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        error: 'Webhook name is required',
      });
      return;
    }

    // Check webhook limits
    console.log(`Checking limits for user ${user.id} (${user.role})`);

    const { count, error: countError } = await supabase
      .from('webhooks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (countError) {
      console.error('Count query failed', countError);
      throw new Error('Database query failed to return count');
    }

    const currentCount = count || 0;
    console.log(`Current count: ${currentCount}`);

    const plans = await getPlans();
    const userRole = user.role as keyof PlanConfig;
    const plan = plans[userRole] || plans.user;
    const limit = plan.maxWebhooks;

    if (currentCount >= limit) {
      res.status(403).json({
        success: false,
        error: `Webhook limit reached. You can only have ${limit} active webhook(s).`,
      });
      return;
    }

    // Generate unique token (UUID without dashes for shorter URL)
    let token = uuidv4().replace(/-/g, '');

    // Custom Alias Logic
    if (alias && alias.trim()) {
      if (!plan.features.customAliases) {
        res.status(403).json({
          success: false,
          error: 'Custom aliases are available only on Professional plan'
        });
        return;
      }

      const cleanAlias = alias.trim();
      // Validate alias format (alphanumeric, hyphens, underscores, 3-50 chars)
      const aliasRegex = /^[a-zA-Z0-9_-]{3,50}$/;
      if (!aliasRegex.test(cleanAlias)) {
        res.status(400).json({
          success: false,
          error: 'Invalid alias format. Use 3-50 alphanumeric characters, hyphens, or underscores.'
        });
        return;
      }

      // Check uniqueness
      const { data: existing, error: checkError } = await supabase
        .from('webhooks')
        .select('token')
        .eq('token', cleanAlias)
        .maybeSingle(); // Use maybeSingle to avoid error if not found

      if (checkError) {
        console.error('Error checking alias uniqueness:', checkError);
        throw checkError;
      }

      if (existing) {
        res.status(409).json({
          success: false,
          error: 'Alias already taken'
        });
        return;
      }

      token = cleanAlias;
    }

    // Calculate expiration time
    const expiresAt = new Date();

    if (plan.webhookExpirationHours > 0) {
      // Set expiration based on plan (e.g., 72 hours for Free)
      expiresAt.setHours(expiresAt.getHours() + plan.webhookExpirationHours);
    } else {
      // Policy: Infinite lifetime (100 years) - No expiration
      expiresAt.setFullYear(expiresAt.getFullYear() + 100);
    }

    // Build webhook URL
    // Handles both local development and production (behind proxy)
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
    const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
    const webhookUrl = `${baseUrl}/api/webhook/${token}`;

    // Store webhook in database (linked to user)
    const { error: insertError } = await supabase
      .from('webhooks')
      .insert({
        token,
        user_id: user.id,
        name: name || null,
        expires_at: expiresAt.toISOString(),
        is_active: true
      });

    if (insertError) throw insertError;

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
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    // Get all webhooks for this user
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('token, name, created_at, expires_at, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Build URLs for each webhook
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
    const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;

    const webhooksWithUrls = (webhooks || []).map(wh => ({
      token: wh.token,
      name: wh.name,
      url: `${baseUrl}/api/webhook/${wh.token}`,
      createdAt: wh.created_at,
      expiresAt: wh.expires_at,
      isActive: wh.is_active,
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
 */
router.get('/requests/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    // Get request and verify it belongs to a webhook owned by the user
    const { data: request, error } = await supabase
      .from('requests')
      .select(`
        *,
        webhooks!inner(user_id)
      `)
      .eq('id', id)
      .eq('webhooks.user_id', user.id)
      .single();

    if (error || !request) {
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
 */
router.get('/:token/requests', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    // Verify webhook exists and is active
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (webhookError || !webhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found, expired, or access denied',
      });
      return;
    }

    // Get requests, sorted newest first
    const { data: requests, error: requestsError } = await supabase
      .from('requests')
      .select('*')
      .eq('webhook_token', token)
      .order('timestamp', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (requestsError) throw requestsError;

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('webhook_token', token);

    if (countError) throw countError;

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

    const parsedRequests = (requests || []).map(req => ({
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
      total: count || 0,
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
router.get('/:token', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { token } = req.params;

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('token', token)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !webhook) {
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
        is_active: webhook.is_active,
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
router.delete('/:token', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { token } = req.params;

    // Only delete if webhook belongs to the user
    const { error, count } = await supabase
      .from('webhooks')
      .delete({ count: 'exact' })
      .eq('token', token)
      .eq('user_id', user.id);

    if (error) throw error;

    if (count === 0) {
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
