import { authenticate } from './utils/auth';
import { getPlans, savePlans } from './utils/plan-storage';

export const onRequestGet = async (context: any) => {
  const { env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const plans = await getPlans(env);
    return new Response(JSON.stringify({
      success: true,
      data: plans
    }), { headers });
  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch plan configuration'
    }), { status: 500, headers });
  }
};

export const onRequestPut = async (context: any) => {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const authResult = await authenticate(request, env);
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  if (user.role !== 'Administrator') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Access denied'
    }), { status: 403, headers });
  }

  try {
    const newConfig = await request.json();

    if (!newConfig || typeof newConfig !== 'object') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid configuration data'
      }), { status: 400, headers });
    }

    await savePlans(newConfig, env);

    return new Response(JSON.stringify({
      success: true,
      message: 'Plan configuration updated successfully',
      data: newConfig
    }), { headers });

  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to update plan configuration'
    }), { status: 500, headers });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
