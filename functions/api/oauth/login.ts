/// <reference path="../cloudflare-env.d.ts" />

export const onRequestGet = async (context: any) => {
    const { env } = context;
    
    // Quran.com OAuth2 Configuration (to be filled in by user)
    const clientId = env.QURAN_CLIENT_ID || 'PENDING_CLIENT_ID';
    const redirectUri = env.QURAN_REDIRECT_URI || 'https://islamic-advisor.pages.dev/api/oauth/callback';
    const scope = 'openid profile email offline_access';
    
    // Generate a random state for security
    const state = crypto.randomUUID();
    
    // Construct the authorization URL
    // Documentation: https://api-docs.quran.foundation/docs/tutorials/oidc/getting-started-with-oauth2
    const authUrl = `https://api.quran.com/api/v4/oauth/authorize?` + 
        new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scope,
            state: state
        }).toString();
        
    return Response.redirect(authUrl);
};
