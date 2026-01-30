
export const onRequest = async (context: any) => {
  const { env } = context;
  
  const keys = Object.keys(env || {});
  const safeEnv = keys.reduce((acc: any, key) => {
    acc[key] = key.includes('KEY') || key.includes('SECRET') || key.includes('PASSWORD') 
      ? '***REDACTED***' 
      : (typeof env[key] === 'string' ? env[key].substring(0, 5) + '...' : typeof env[key]);
    return acc;
  }, {});

  return new Response(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    envKeys: keys,
    envPreview: safeEnv,
    provider: 'Cloudflare Pages Functions'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
