
import { getPlans, savePlans } from '../../api/utils/plan-storage';
import { envContext } from '../../api/lib/context';
import { verifyToken, type UserPayload } from '../../api/utils/auth';

interface Env {
  [key: string]: string | undefined;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return envContext.run(context.env, async () => {
    try {
      const plans = await getPlans();
      return new Response(JSON.stringify({
        success: true,
        data: plans
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      console.error('Error fetching plans:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch plan configuration'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  return envContext.run(context.env, async () => {
    try {
      const authHeader = context.request.headers.get('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No token provided',
        }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const user = verifyToken(token);

      if (!user) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid or expired token',
        }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      if (user.role !== 'Administrator') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Access denied. Administrator privileges required.',
        }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }

      const newConfig = await context.request.json() as any;
      
      // Basic validation
      if (!newConfig || typeof newConfig !== 'object') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid configuration data'
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      await savePlans(newConfig);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Plan configuration updated successfully',
        data: newConfig
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      console.error('Error updating plans:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to update plan configuration'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });
};
