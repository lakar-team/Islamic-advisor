/// <reference path="../../cloudflare-env.d.ts" />

export const onRequestGet = async (context: any) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const origin = url.origin;
    
    // Extract the id_token_hint passed from the frontend
    const idTokenHint = url.searchParams.get('id_token_hint');
    
    // Configuration
    const oauthBase = env.QURAN_OAUTH_BASE_URL || 'https://oauth2.quran.foundation';

    // Always clear the httpOnly refresh token cookie
    const clearCookieHeader = 'qf_refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
    
    if (!idTokenHint) {
        // If there's no id_token_hint, we can't do a strict OIDC logout with a redirect back.
        // Fallback to just clearing the cookie and returning to the app.
        return new Response(null, {
            status: 302,
            headers: {
                'Location': `${origin}/`,
                'Set-Cookie': clearCookieHeader
            }
        });
    }

    // Standard OIDC RP-Initiated Logout endpoint
    const logoutUrl = `${oauthBase}/oauth2/sessions/logout?` + 
        new URLSearchParams({
            id_token_hint: idTokenHint,
            post_logout_redirect_uri: `${origin}/`,
        }).toString();

    // Clear the cookie AND redirect the user to the IDP's logout endpoint
    return new Response(null, {
        status: 302,
        headers: {
            'Location': logoutUrl,
            'Set-Cookie': clearCookieHeader
        }
    });
};
