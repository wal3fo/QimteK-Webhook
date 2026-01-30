import { getSupabase } from '../../utils/supabase';

// Helper to get PayPal Access Token
async function getPayPalAccessToken(env: any): Promise<string> {
    const rawClientId = env.PAYPAL_CLIENT_ID || '';
    const rawSecret = env.PAYPAL_CLIENT_SECRET || '';

    const PAYPAL_CLIENT_ID = rawClientId.replace(/^"|"$/g, '').trim();
    const PAYPAL_SECRET = rawSecret.replace(/^"|"$/g, '').trim();

    const NODE_ENV = env.NODE_ENV || 'development';

    const PAYPAL_API_URL = NODE_ENV === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
        throw new Error('Missing PayPal credentials (PAYPAL_CLIENT_ID or PAYPAL_SECRET)');
    }

    const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`);

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
        throw new Error(`Failed to get PayPal access token: ${response.status} ${errorText}`);
    }

    const data = await response.json() as { access_token: string };
    return data.access_token;
}

export const onRequestPost = async (context: any) => {
    try {
        const { request, env } = context;
        const body = await request.json();
        const { orderID, userId } = body;

        const NODE_ENV = env.NODE_ENV || 'development';
        const PAYPAL_API_URL = NODE_ENV === 'production'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        // 1. Accept JSON payload with { orderID: string }
        if (!orderID || typeof orderID !== 'string') {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid or missing orderID'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Authenticate with PayPal to get Access Token
        let accessToken: string;
        try {
            accessToken = await getPayPalAccessToken(env);
        } catch (authError: any) {
            console.error('PayPal Auth Error:', authError.message);
            return new Response(JSON.stringify({
                success: false,
                error: `Authentication failed with payment provider. Details: ${authError.message}`
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 3. Use PayPal REST API v2 to check the order status
        const orderResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderID}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!orderResponse.ok) {
            const errorData = await orderResponse.json() as any;
            return new Response(JSON.stringify({
                success: false,
                error: errorData.error_description || 'Failed to verify order status'
            }), {
                status: orderResponse.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const orderData = await orderResponse.json() as any;

        // 4. Confirm the order status is "COMPLETED"
        if (orderData.status !== 'COMPLETED') {
            return new Response(JSON.stringify({
                success: false,
                error: `Order status is ${orderData.status}, expected COMPLETED`
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 5. Update User Plan (if userId provided)
        if (userId) {
            const supabase = getSupabase(env);
            
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
            }
        }

        return new Response(JSON.stringify({
            success: true,
            order: orderData
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        console.error('Payment Verification Exception:', e);
        return new Response(JSON.stringify({
            success: false,
            error: `Internal Server Error: ${e.message}`
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
