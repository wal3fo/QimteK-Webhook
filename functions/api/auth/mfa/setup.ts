
import { authenticate, generateMfaSecret, generateQrCode } from '../../utils/auth';

export const onRequestPost = async (context: any) => {
  const { request, env } = context;
  const authResult = await authenticate(request, env);
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const { secret, otpauth } = generateMfaSecret(user.email);
    const qrCodeUrl = await generateQrCode(otpauth);

    return new Response(JSON.stringify({
      success: true,
      secret,
      qrCodeUrl
    }), { status: 200, headers });

  } catch (error: any) {
    console.error('Error setting up MFA:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to setup MFA'
    }), { status: 500, headers });
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
