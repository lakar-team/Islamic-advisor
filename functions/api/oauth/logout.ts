/// <reference path="../../cloudflare-env.d.ts" />

export const onRequestGet = async (context: any) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const origin = url.origin;
    
    // Extract the id_token_hint passed from the frontend
    const idTokenHint = url.searchParams.get('id_token_hint');
    
    // Configuration
    const oauthBase = env.QURAN_OAUTH_BASE_URL || 'https://oauth2.quran.foundation';
    
    if (!idTokenHint) {
        // If there's no id_token_hint, we can't do a strict OIDC logout with a redirect back.
        // Fallback to just returning to the app.
        return Response.redirect(`${origin}/`);
    }

    // Standard OIDC RP-Initiated Logout endpoint
    const logoutUrl = `${oauthBase}/oauth2/sessions/logout?` + 
        new URLSearchParams({
            id_token_hint: idTokenHint,
            post_logout_redirect_uri: `${origin}/`,
        }).toString();

    // Redirect the user to the IDP's logout endpoint
    return Response.redirect(logoutUrl);
};
