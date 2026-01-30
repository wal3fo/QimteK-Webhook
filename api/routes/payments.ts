import { Router, type Request, type Response } from 'express';
import { getEnv } from '../lib/context.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

/**
 * Helper to get PayPal Access Token
 * Uses Basic Auth with Client ID and Secret to get a Bearer token
 */
async function getPayPalAccessToken(): Promise<string> {
    // Lazy load environment variables
    // Strip quotes if present (common issue in some env parsers)
    const rawClientId = getEnv('PAYPAL_CLIENT_ID') || '';
    const rawSecret = getEnv('PAYPAL_CLIENT_SECRET') || '';

    const PAYPAL_CLIENT_ID = rawClientId.replace(/^"|"$/g, '').trim();
    const PAYPAL_SECRET = rawSecret.replace(/^"|"$/g, '').trim();

    const NODE_ENV = getEnv('NODE_ENV') || 'development';

    // PayPal API Configuration
    const PAYPAL_API_URL = NODE_ENV === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
        console.error('Missing PayPal credentials. ClientID:', !!PAYPAL_CLIENT_ID, 'Secret:', !!PAYPAL_SECRET);
        throw new Error('Missing PayPal credentials (PAYPAL_CLIENT_ID or PAYPAL_SECRET)');
    }

    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');

    // console.log(`[PayPal] Authenticating in ${NODE_ENV} mode...`);

    const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
        method: 'POST',
        body: 'grant_type=client_credentials',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[PayPal] Auth Failed: ${response.status} ${errorText}`);
        throw new Error(`Failed to get PayPal access token: ${response.status} ${errorText}`);
    }

    const data = await response.json() as { access_token: string };
    return data.access_token;
}

/**
 * Verify PayPal Payment
 * POST /api/payments/verify
 * Expects JSON: { orderID: string }
 */
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderID, userId } = req.body;
        const NODE_ENV = getEnv('NODE_ENV') || 'development';
        const PAYPAL_API_URL = NODE_ENV === 'production'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        // 1. Accept JSON payload with { orderID: string }
        if (!orderID || typeof orderID !== 'string') {
            res.status(400).json({ success: false, error: 'Invalid or missing orderID' });
            return;
        }

        // 2. Authenticate with PayPal to get Access Token
        let accessToken: string;
        try {
            accessToken = await getPayPalAccessToken();
        } catch (authError: any) {
            console.error('PayPal Auth Error:', authError.message);
            // Gracefully handle auth errors
            res.status(500).json({
                success: false,
                error: `Authentication failed with payment provider. Check server logs. Mode: ${NODE_ENV}. Details: ${authError.message}`
            });
            return;
        }

        // 3. Use PayPal REST API v2 to check the order status
        // We do not capture here; we only verify the status.
        const orderResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderID}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!orderResponse.ok) {
            const errorData = await orderResponse.json() as any;
            console.error('PayPal Verify Error:', errorData);
            res.status(orderResponse.status).json({
                success: false,
                error: errorData.error_description || 'Failed to verify order status'
            });
            return;
        }

        const orderData = await orderResponse.json() as any;

        // 4. Confirm the order status is "COMPLETED"
        if (orderData.status !== 'COMPLETED') {
            res.status(400).json({
                success: false,
                error: `Order status is ${orderData.status}, expected COMPLETED`
            });
            return;
        }

        // 5. Update User Plan (if userId provided)
        if (userId) {
            console.log(`Upgrading user ${userId} to Professional plan...`);

            // Set expiration to 1 year from now
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);

            const { error: updateError } = await supabase
                .from('users')
                .update({
                    role: 'Professional',
                    plan_expires_at: expiresAt.toISOString()
                })
                .eq('id', userId);

            if (updateError) {
                console.error('Database Update Error:', updateError);
                // We still return success because payment was verified, but we warn the client
                // or we could fail. Since money is taken, we should probably return success
                // but log this critically.
            } else {
                console.log(`User ${userId} upgraded successfully.`);
            }
        } else {
            console.warn('Payment verified but no userId provided. User plan not updated.');
        }

        // 6. Return JSON { success: true, order: <orderData> }
        res.json({
            success: true,
            order: orderData
        });

    } catch (error: any) {
        // 7. Handle errors gracefully and never throw a 500 unhandled exception
        console.error('Payment Verification Exception:', error);
        res.status(500).json({
            success: false,
            error: `Internal Server Error: ${error.message}`
        });
    }
});

export default router;
