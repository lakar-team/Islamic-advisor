import { QfOAuthService } from '../../lib/qf-oauth-service';

/**
 * Step 2: Auth URL + Secure State (Initiation)
 */
export const onRequestPost = async (context: any) => {
    const { request, env } = context;
    
    try {
        const body = await request.json();
        const { state } = body;

        const oauthService = new QfOAuthService(env);
        const redirectUri = 'https://islamic-advisor.pages.dev/api/oauth/callback';
        
        const result = await oauthService.buildAuthorizationUrl({
            redirectUri,
            state
        });

        // Step 2: Redirect to {authBaseUrl}/oauth2/auth
        // We return the URL to the frontend so it can perform the top-level redirect
        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
