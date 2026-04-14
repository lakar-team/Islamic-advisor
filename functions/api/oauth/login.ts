/// <reference path="../../cloudflare-env.d.ts" />

export const onRequestGet = async (context: any) => {
    const { request, env } = context;

    // Quran.com OAuth2 Configuration
    const url = new URL(request.url);
    const origin = url.origin;
    const state = url.searchParams.get('state') || 'landing';

    const oauthBase = env.QURAN_OAUTH_BASE_URL || 'https://oauth2.quran.foundation';
    const clientId = env.QURAN_CLIENT_ID || '';
    const redirectUri = env.QURAN_REDIRECT_URI || `${origin}/api/oauth/callback`;
    
    // Standard OIDC scopes — 'email' and custom ones are restricted for this client ID
    const scope = 'openid profile';

    if (!clientId) {
        return new Response('OAuth not configured: missing QURAN_CLIENT_ID', { status: 500 });
    }

    // Standard OIDC Authorization Code flow
    const authUrl = `${oauthBase}/oauth2/auth?` +
        new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope,
            state,
            prompt: 'select_account', // Enables user switching
        }).toString();

    return Response.redirect(authUrl);
};
