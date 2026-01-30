export const onRequest = async (context: any) => {
  const { env } = context;
  
  return new Response(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV || 'unknown',
    provider: 'Cloudflare Pages Functions'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
