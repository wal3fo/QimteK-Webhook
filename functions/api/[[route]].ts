
export const onRequest = async () => {
  return new Response(JSON.stringify({
    success: false,
    error: 'Not Found',
    message: 'The requested API endpoint does not exist.'
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
};
