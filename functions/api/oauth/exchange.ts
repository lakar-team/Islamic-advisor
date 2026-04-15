import { QfOAuthService } from '../../lib/qf-oauth-service';

export const onRequestPost = async (context: any) => {
    const { request, env } = context;
    
    try {
        const body = await request.json();
        const { code, state } = body;

        if (!code || !state) {
            return new Response(JSON.stringify({ error: 'Missing code or state' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const oauthService = new QfOAuthService(env);
        const result = await oauthService.exchangeAuthorizationCode({ code, state });

        // Step 5: Securely store refresh_token in httpOnly cookie
        const { refresh_token, ...safeResult } = result;
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (refresh_token) {
            // Set-Cookie: qf_refresh_token=...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=...
            headers['Set-Cookie'] = `qf_refresh_token=${refresh_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`;
        }

        return new Response(JSON.stringify(safeResult), { headers });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message || 'Failed to exchange authorization code for tokens' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
