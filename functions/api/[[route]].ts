export const onRequest = async (context: any) => {
  return new Response(JSON.stringify({
    success: false,
    error: 'API route not found',
    path: new URL(context.request.url).pathname
  }), { status: 404, headers: { 'Content-Type': 'application/json' } });
};
