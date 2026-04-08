/// <reference path="../../cloudflare-env.d.ts" />

export const onRequestGet = async (context: any) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
        return Response.redirect(`${new URL(request.url).origin}/#chat?oauth_error=${encodeURIComponent(error)}`);
    }

    if (!code) {
        return new Response('Missing authorization code', { status: 400 });
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://api.quran.com/api/v4/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: env.QURAN_CLIENT_ID,
                client_secret: env.QURAN_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: env.QURAN_REDIRECT_URI,
            }),
        });

        const tokens: any = await tokenResponse.json();

        if (!tokenResponse.ok) {
            throw new Error(tokens.error_description || tokens.error || 'Failed to exchange token');
        }

        // Redirect back to the app with the access token in a secure hash or cookie
        // For 100% browser-based state as requested, we'll pass it back to the UI
        // In a real production app, we might use a secure session cookie.
        const redirectUrl = new URL(request.url);
        redirectUrl.pathname = '/';
        redirectUrl.search = '';
        redirectUrl.hash = `chat?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token || ''}`;

        return Response.redirect(redirectUrl.toString());
    } catch (e: any) {
        return Response.redirect(`${new URL(request.url).origin}/#chat?oauth_error=${encodeURIComponent(e.message)}`);
    }
};
