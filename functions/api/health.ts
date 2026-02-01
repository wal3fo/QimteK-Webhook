export const onRequest = async (context: any) => {
  const { env } = context;
  
  return new Response(JSON.stringify({
    success: true,
    message: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV || 'development',
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
