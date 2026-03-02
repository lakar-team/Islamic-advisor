/// <reference path="../cloudflare-env.d.ts" />

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
        // Increment visitor count
        const visitors = await kv.get('total_visitors') || '0';
        const newCount = parseInt(visitors) + 1;
        await kv.put('total_visitors', newCount.toString());

        // Update country counts
        const country = request.cf?.country || 'Unknown';
        const countriesRaw = await kv.get('country_counts') || '{}';
        const countries = JSON.parse(countriesRaw);
        countries[country] = (countries[country] || 0) + 1;
        await kv.put('country_counts', JSON.stringify(countries));

        return new Response(JSON.stringify({ success: true, count: newCount }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
};
