import { QfOAuthService } from '../../lib/qf-oauth-service';

/**
 * Step 5: Refresh Token Endpoint
 */
export const onRequestPost = async (context: any) => {
  const { request, env } = context;
  
  try {
    const { sessionId, refreshToken } = await request.json();

    if (!sessionId || !refreshToken) {
      return new Response(JSON.stringify({ error: 'Missing sessionId or refreshToken' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const oauthService = new QfOAuthService(env);
    const result = await oauthService.refreshAccessToken(sessionId, refreshToken);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to refresh access token' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
