/// <reference path="../cloudflare-env.d.ts" />

/** Hash the IP so we never store raw IPs in KV (basic privacy). */
async function hashIp(ip: string): Promise<string> {
    const buf = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(ip + '-islamic-advisor')
    );
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 32);
}

export const onRequestGet = async (context: any) => {
    const { env } = context;
    const kv = env.RATE_LIMIT;

    if (!kv) {
        return new Response(JSON.stringify({ error: 'KV binding missing' }), { status: 500 });
    }

    const visitors = await kv.get('total_visitors') || '0';
    const questions = await kv.get('questions_answered') || '0';
    const countriesRaw = await kv.get('country_counts') || '{}';
    const countries = JSON.parse(countriesRaw);

    return new Response(JSON.stringify({
        total_visitors: parseInt(visitors),
        questions_answered: parseInt(questions),
        country_counts: countries
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
};

export const onRequestPost = async (context: any) => {
    const { request, env } = context;
    const kv = env.RATE_LIMIT;

    if (!kv) {
        return new Response(JSON.stringify({ error: 'KV binding missing' }), { status: 500 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'track_visit') {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const hashedIp = await hashIp(ip);
        const uvKey = `uv:${hashedIp}`;

        // Check if this visitor is already tracked today
        const alreadyTracked = await kv.get(uvKey);

        let visitors = await kv.get('total_visitors') || '0';
        let newCount = parseInt(visitors);

        if (!alreadyTracked) {
            // New unique visitor
            newCount++;
            await kv.put('total_visitors', newCount.toString());

            // Mark as tracked (TTL of 24 hours to keep it "daily unique" or remove expiration for absolute unique)
            // Using 24 hours (86400 seconds) for standard unique visitor behavior
            await kv.put(uvKey, 'true', { expirationTtl: 86400 });

            // Update country counts only for unique visitors
            const country = request.cf?.country || 'Unknown';
            const countriesRaw = await kv.get('country_counts') || '{}';
            const countries = JSON.parse(countriesRaw);
            countries[country] = (countries[country] || 0) + 1;
            await kv.put('country_counts', JSON.stringify(countries));
        }

        return new Response(JSON.stringify({ success: true, count: newCount, unique: !alreadyTracked }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
};
