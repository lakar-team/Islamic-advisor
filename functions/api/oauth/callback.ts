/// <reference path="../../cloudflare-env.d.ts" />

export const onRequestGet = async (context: any) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    const origin = new URL(request.url).origin;
    const oauthBase = env.QURAN_OAUTH_BASE_URL || 'https://oauth2.quran.foundation';

    if (error) {
        return Response.redirect(`${origin}/#chat?oauth_error=${encodeURIComponent(error)}`);
    }

    if (!code) {
        return new Response('Missing authorization code', { status: 400 });
    }

    try {
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
                redirect_uri: env.QURAN_REDIRECT_URI,
            }).toString(),
        });

        const tokens: any = await tokenResponse.json();

        if (!tokenResponse.ok) {
            throw new Error(tokens.error_description || tokens.error || 'Token exchange failed');
        }

        // Return access token to the browser via a URL hash — keeps server stateless
        const redirectUrl = new URL(request.url);
        redirectUrl.pathname = '/';
        redirectUrl.search = '';
        redirectUrl.hash = `chat?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token || ''}`;

        return Response.redirect(redirectUrl.toString());
    } catch (e: any) {
        return Response.redirect(`${origin}/#chat?oauth_error=${encodeURIComponent(e.message)}`);
    }
};
