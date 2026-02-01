
import { getEnv, envContext } from '../../../api/lib/context';
import { supabase } from '../../../api/lib/supabase';

interface Env {
    [key: string]: string | undefined;
}

async function getPayPalAccessToken(): Promise<string> {
    const rawClientId = getEnv('PAYPAL_CLIENT_ID') || '';
    const rawSecret = getEnv('PAYPAL_CLIENT_SECRET') || '';

    const PAYPAL_CLIENT_ID = rawClientId.replace(/^"|"$/g, '').trim();
    const PAYPAL_SECRET = rawSecret.replace(/^"|"$/g, '').trim();
    const NODE_ENV = getEnv('NODE_ENV') || 'development';

    const PAYPAL_API_URL = NODE_ENV === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
        throw new Error('Missing PayPal credentials (PAYPAL_CLIENT_ID or PAYPAL_SECRET)');
    }

    const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`); // Use btoa for Base64

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

export const onRequestPost: PagesFunction<Env> = async (context) => {
    return envContext.run(context.env, async () => {
        try {
            const { orderID, userId } = await context.request.json() as any;
            const NODE_ENV = getEnv('NODE_ENV') || 'development';
            const PAYPAL_API_URL = NODE_ENV === 'production'
                ? 'https://api-m.paypal.com'
                : 'https://api-m.sandbox.paypal.com';

            if (!orderID || typeof orderID !== 'string') {
                return new Response(JSON.stringify({ success: false, error: 'Invalid or missing orderID' }), { status: 400 });
            }

            let accessToken: string;
            try {
                accessToken = await getPayPalAccessToken();
            } catch (authError: any) {
                console.error('PayPal Auth Error:', authError.message);
                return new Response(JSON.stringify({
                    success: false,
                    error: `Authentication failed with payment provider. Mode: ${NODE_ENV}. Details: ${authError.message}`
                }), { status: 500 });
            }

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
                return new Response(JSON.stringify({
                    success: false,
                    error: errorData.error_description || 'Failed to verify order status'
                }), { status: 400 });
            }

            const orderData = await orderResponse.json() as any;

            if (orderData.status !== 'COMPLETED') {
                return new Response(JSON.stringify({
                    success: false,
                    error: `Order status is ${orderData.status}, expected COMPLETED`
                }), { status: 400 });
            }

            if (userId) {
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
                } else {
                    console.log(`User ${userId} upgraded successfully.`);
                }
            }

            return new Response(JSON.stringify({
                success: true,
                order: orderData
            }), { headers: { 'Content-Type': 'application/json' } });

        } catch (error: any) {
            console.error('Payment verification error:', error);
            return new Response(JSON.stringify({
                success: false,
                error: `Internal Server Error: ${error.message}`
            }), { status: 500 });
        }
    });
};
