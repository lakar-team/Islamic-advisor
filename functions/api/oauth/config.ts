/// <reference path="../../cloudflare-env.d.ts" />

export const onRequestGet = async (context: any) => {
    const { env } = context;
    
    const config = {
        clientId: env.QURAN_CLIENT_ID,
        oauthBase: env.QURAN_OAUTH_BASE_URL || 'https://oauth2.quran.foundation',
        redirectUri: 'https://islamic-advisor.pages.dev/api/oauth/callback',
    };

    return new Response(JSON.stringify(config), {
        headers: { 'Content-Type': 'application/json' }
    });
};
