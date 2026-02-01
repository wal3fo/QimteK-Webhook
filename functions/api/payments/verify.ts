
import { createSupabaseClient } from '../lib/supabase';

interface Env {
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
  NODE_ENV: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

/**
 * Helper to get PayPal Access Token
 */
async function getPayPalAccessToken(env: Env): Promise<string> {
  const clientId = (env.PAYPAL_CLIENT_ID || '').replace(/^"|"$/g, '').trim();
  const clientSecret = (env.PAYPAL_CLIENT_SECRET || '').replace(/^"|"$/g, '').trim();
  
  // Use 'production' if explicitly set, otherwise default to sandbox/development logic
  // Cloudflare often sets NODE_ENV to 'production' in live builds
  const isProd = env.NODE_ENV === 'production';
  const apiBase = isProd ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

  if (!clientId || !clientSecret) {
    throw new Error('Missing PayPal credentials (PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET)');
  }

  const authString = `${clientId}:${clientSecret}`;
  const authBase64 = btoa(authString);

  const response = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      'Authorization': `Basic ${authBase64}`,
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
  const { request, env } = context;

  // Handle CORS preflight requests if needed (though usually OPTIONS is handled separately)
  // But for POST, we need to add headers to the response
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const { orderID, userId } = await request.json() as { orderID: string, userId?: string };

    if (!orderID || typeof orderID !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'Invalid or missing orderID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Authenticate with PayPal
    let accessToken: string;
    try {
      accessToken = await getPayPalAccessToken(env);
    } catch (authError: any) {
      console.error('PayPal Auth Error:', authError.message);
      return new Response(JSON.stringify({
        success: false,
        error: `Authentication failed with payment provider: ${authError.message}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Verify Order
    const isProd = env.NODE_ENV === 'production';
    const apiBase = isProd ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    
    const orderResponse = await fetch(`${apiBase}/v2/checkout/orders/${orderID}`, {
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
      }), {
        status: orderResponse.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const orderData = await orderResponse.json() as any;

    if (orderData.status !== 'COMPLETED') {
      return new Response(JSON.stringify({
        success: false,
        error: `Order status is ${orderData.status}, expected COMPLETED`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Update User Plan
    if (userId) {
      const supabase = createSupabaseClient(env);
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
        // Log error but return success as payment was verified
      }
    }

    return new Response(JSON.stringify({
      success: true,
      order: orderData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error: any) {
    console.error('Payment Verification Exception:', error);
    return new Response(JSON.stringify({
      success: false,
      error: `Internal Server Error: ${error.message}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
};
