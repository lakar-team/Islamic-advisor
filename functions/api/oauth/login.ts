/// <reference path="../../cloudflare-env.d.ts" />

export const onRequestGet = async (context: any) => {
    const { env } = context;

    // Quran.com OAuth2 Configuration
    // QURAN_OAUTH_BASE_URL: prelive-oauth2.quran.foundation (stable/test) or oauth2.quran.foundation (main/prod)
    const oauthBase = env.QURAN_OAUTH_BASE_URL || 'https://oauth2.quran.foundation';
    const clientId = env.QURAN_CLIENT_ID || '';
    const redirectUri = env.QURAN_REDIRECT_URI || 'https://islamic-advisor.pages.dev/api/oauth/callback';
    const scope = 'openid profile offline_access bookmarks notes reading_history';

    if (!clientId) {
        return new Response('OAuth not configured: missing QURAN_CLIENT_ID', { status: 500 });
    }

    // Generate a random state param for CSRF protection
    const state = crypto.randomUUID();

    // Standard OIDC Authorization Code flow
    const authUrl = `${oauthBase}/oauth2/auth?` +
        new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope,
            state,
        }).toString();

    return Response.redirect(authUrl);
};
