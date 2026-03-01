/// <reference path="../cloudflare-env.d.ts" />
import { SHEIKH_SYSTEM_PROMPT } from '../../src/lib/ai-prompt';

// ─── Config ─────────────────────────────────────────────────────────────────
const DAILY_LIMIT = 20;           // Max AI requests per IP per day
const WINDOW_MS = 86_400_000;  // 24 hours in ms

// ─── Types ───────────────────────────────────────────────────────────────────
interface RateLimitRecord {
    count: number;
    windowStart: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Hash the IP so we never store raw IPs in KV (basic privacy). */
async function hashIp(ip: string): Promise<string> {
    const buf = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(ip + '-online-sheikh')
    );
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 32); // 32-char hex prefix is plenty
}

/** Check and update the rate limit for this IP. Returns `true` if allowed. */
async function checkKvRateLimit(kv: KVNamespace, ip: string): Promise<{ allowed: boolean; remaining: number }> {
    const key = `rl:${await hashIp(ip)}`;
    const raw = await kv.get(key);
    const now = Date.now();

    let record: RateLimitRecord = raw
        ? JSON.parse(raw)
        : { count: 0, windowStart: now };

    // Reset window if 24 h have passed
    if (now - record.windowStart > WINDOW_MS) {
        record = { count: 0, windowStart: now };
    }

    if (record.count >= DAILY_LIMIT) {
        return { allowed: false, remaining: 0 };
    }

    // Increment and persist (TTL = 25 h so KV self-cleans)
    record.count += 1;
    await kv.put(key, JSON.stringify(record), { expirationTtl: 90_000 });

    return { allowed: true, remaining: DAILY_LIMIT - record.count };
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export const onRequestPost = async (context: any) => {
    const { request, env } = context;

    // ── Server-side rate limiting via KV ──────────────────────────────────────
    const ip =
        request.headers.get('CF-Connecting-IP') ||
        request.headers.get('X-Forwarded-For') ||
        'unknown';

    if (env.RATE_LIMIT) {
        // KV namespace is bound — enforce the real limit
        const { allowed, remaining } = await checkKvRateLimit(env.RATE_LIMIT, ip);
        if (!allowed) {
            return new Response(
                JSON.stringify({ error: 'Rate limit exceeded. You have used your 20 daily requests. Please try again tomorrow.' }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-RateLimit-Limit': String(DAILY_LIMIT),
                        'X-RateLimit-Remaining': '0',
                        'Retry-After': '86400',
                    },
                }
            );
        }
        // Attach remaining header to response (useful for future UI indicators)
        context.__remaining = remaining;
    }
    // If RATE_LIMIT binding is missing (local dev), skip silently.

    // ── AI Request ────────────────────────────────────────────────────────────
    try {
        const { messages } = await request.json();

        const apiUrl = env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
        const model = env.AI_MODEL || 'google/gemini-2.0-flash-001';

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.AI_API_KEY}`,
                'HTTP-Referer': 'https://islamic-advisor.pages.dev',
                'X-Title': 'Online Sheikh AI',
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: env.SHEIKH_PROMPT || SHEIKH_SYSTEM_PROMPT },
                    ...messages,
                ],
                temperature: 0.7,
            }),
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': String(DAILY_LIMIT),
                'X-RateLimit-Remaining': String(context.__remaining ?? DAILY_LIMIT),
            },
        });

    } catch (error) {
        return new Response(
            JSON.stringify({ error: 'Operation failed' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
