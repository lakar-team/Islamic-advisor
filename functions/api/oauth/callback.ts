/// <reference path="../../cloudflare-env.d.ts" />

export const onRequestGet = async (context: any) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    const origin = new URL(request.url).origin;
    const oauthBase = env.QURAN_OAUTH_BASE_URL || 'https://oauth2.quran.foundation';

    if (error) {
        const state = url.searchParams.get('state') || 'landing';
        const params = new URLSearchParams({ error, return: state });
        return Response.redirect(`${origin}/#oauth-callback?${params.toString()}`);
    }

    if (!code) {
        return new Response('Missing authorization code', { status: 400 });
    }

    try {
        const state = url.searchParams.get('state') || 'landing';

        // Exchange authorization code for tokens using the correct environment endpoint
        // Use client_secret_basic as required by the Quran Foundation OAuth server
        const credentials = btoa(`${env.QURAN_CLIENT_ID}:${env.QURAN_CLIENT_SECRET}`);
        
        const tokenResponse = await fetch(`${oauthBase}/oauth2/token`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`
            },
            body: new URLSearchParams({
                code,
                grant_type: 'authorization_code',
                redirect_uri: env.QURAN_REDIRECT_URI || `${origin}/api/oauth/callback`,
            }).toString(),
        });

        const tokens: any = await tokenResponse.json();

        if (!tokenResponse.ok) {
            throw new Error(tokens.error_description || tokens.error || 'Token exchange failed');
        }

        // Determine the correct API base to match the OAuth environment
        const apiBase = oauthBase.includes('prelive') 
            ? 'https://apis-prelive.quran.foundation' 
            : 'https://api.quran.com';

        // Always redirect to the dedicated #oauth-callback hash
        const redirectUrl = new URL(request.url);
        redirectUrl.pathname = '/';
        redirectUrl.search = '';
        
        const params = new URLSearchParams({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || '',
            api_base: apiBase, // URLSearchParams handles encoding
            return: state
        });
        
        redirectUrl.hash = `oauth-callback?${params.toString()}`;

        return Response.redirect(redirectUrl.toString());
    } catch (e: any) {
        const state = url.searchParams.get('state') || 'landing';
        const params = new URLSearchParams({
            error: e.message,
            return: state
        });
        return Response.redirect(`${origin}/#oauth-callback?${params.toString()}`);
    }
};
