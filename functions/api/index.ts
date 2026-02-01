export const onRequest = async () => {
  return new Response(JSON.stringify({
    success: true,
    message: 'QimteK Webhook API',
    version: '1.0.0'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
