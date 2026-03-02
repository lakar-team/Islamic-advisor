/// <reference path="../cloudflare-env.d.ts" />

interface Review {
    id: string;
    name: string;
    text: string;
    timestamp: number;
}

export const onRequestGet = async (context: any) => {
    const { env } = context;
    const kv = env.RATE_LIMIT;

    if (!kv) {
        return new Response(JSON.stringify([]), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const reviewsRaw = await kv.get('reviews') || '[]';
    return new Response(reviewsRaw, {
        headers: { 'Content-Type': 'application/json' }
    });
};

export const onRequestPost = async (context: any) => {
    const { request, env } = context;
    const kv = env.RATE_LIMIT;

    if (!kv) {
        return new Response(JSON.stringify({ error: 'KV binding missing' }), { status: 500 });
    }

    try {
        const { name, text } = await request.json() as { name: string; text: string };
        if (!name || !text) {
            return new Response(JSON.stringify({ error: 'Missing name or text' }), { status: 400 });
        }

        const reviewsRaw = await kv.get('reviews') || '[]';
        const reviews = JSON.parse(reviewsRaw) as Review[];

        const newReview: Review = {
            id: crypto.randomUUID(),
            name,
            text,
            timestamp: Date.now()
        };

        // Add to the beginning of the list, keep last 50
        reviews.unshift(newReview);
        const limitedReviews = reviews.slice(0, 50);

        await kv.put('reviews', JSON.stringify(limitedReviews));

        return new Response(JSON.stringify(newReview), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to add review' }), { status: 500 });
    }
};
