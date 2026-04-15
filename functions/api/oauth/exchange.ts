/// <reference path="../../cloudflare-env.d.ts" />

export const onRequestPost = async (context: any) => {
    const { request, env } = context;
    
    try {
        const body = await request.json();
        const { code, code_verifier, redirect_uri } = body;

        if (!code || !code_verifier) {
            return new Response(JSON.stringify({ error: 'Missing code or code_verifier' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const oauthBase = env.QURAN_OAUTH_BASE_URL || 'https://oauth2.quran.foundation';
        
        // Use client_secret_basic authentication as required by Quran Foundation
        const credentials = btoa(`${env.QURAN_CLIENT_ID}:${env.QURAN_CLIENT_SECRET}`);
        
        const tokenResponse = await fetch(`${oauthBase}/oauth2/token`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`
            },
            body: new URLSearchParams({
                code,
                code_verifier,
                grant_type: 'authorization_code',
                redirect_uri: redirect_uri || 'https://islamic-advisor.pages.dev/api/oauth/callback',
            }).toString(),
        });

        const tokens: any = await tokenResponse.json();

        if (!tokenResponse.ok) {
            return new Response(JSON.stringify({ 
                error: tokens.error_description || tokens.error || 'Token exchange failed' 
            }), { 
                status: tokenResponse.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Determine the correct API base to match the environment
        const apiBase = oauthBase.includes('prelive') 
            ? 'https://apis-prelive.quran.foundation' 
            : 'https://api.quran.com';

        return new Response(JSON.stringify({
            ...tokens,
            api_base: apiBase,
            client_id: env.QURAN_CLIENT_ID
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
