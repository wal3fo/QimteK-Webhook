
interface Env {
  NODE_ENV?: string;
}

export async function onRequest(context: { env: Env }) {
  const { env } = context;
  return new Response(JSON.stringify({
    success: true,
    message: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV || 'development',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
