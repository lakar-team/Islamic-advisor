import { getQfOAuthConfig } from '../../lib/qf-oauth-config';

export const onRequestGet = async (context: any) => {
    try {
        const config = getQfOAuthConfig(context.env);
        
        return new Response(JSON.stringify({
            clientId: config.clientId,
            authBaseUrl: config.authBaseUrl,
            apiBaseUrl: config.apiBaseUrl,
            redirectUri: 'https://islamic-advisor.pages.dev/api/oauth/callback',
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
