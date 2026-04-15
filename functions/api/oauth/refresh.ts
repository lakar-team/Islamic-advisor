import { QfOAuthService } from '../../lib/qf-oauth-service';

/**
 * Step 5: Refresh Token Endpoint
 */
export const onRequestPost = async (context: any) => {
  const { request, env } = context;
  
  try {
    const { sessionId } = await request.json();
    
    // Step 5: Read refresh_token from secure httpOnly cookie
    const cookieHeader = request.headers.get('Cookie') || '';
    const refreshToken = cookieHeader.split('; ')
        .find((row: string) => row.startsWith('qf_refresh_token='))
        ?.split('=')[1];

    if (!sessionId || !refreshToken) {
      return new Response(JSON.stringify({ error: 'Missing sessionId or secure session' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const oauthService = new QfOAuthService(env);
    const result = await oauthService.refreshAccessToken(sessionId, refreshToken);

    const { refresh_token, ...safeResult } = result;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (refresh_token) {
        headers['Set-Cookie'] = `qf_refresh_token=${refresh_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`;
    }

    return new Response(JSON.stringify(safeResult), { headers });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to refresh access token' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
