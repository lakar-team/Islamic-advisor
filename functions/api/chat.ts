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

    // ── AI Request Pipeline ───────────────────────────────────────────────────
    try {
        const { messages } = await request.json();
        const userQuery = messages[messages.length - 1].content;

        const apiUrl = env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
        const model = env.AI_MODEL || 'google/gemini-2.0-flash-001';
        const apiKey = env.AI_API_KEY;

        // --- STAGE 1: Keyword Extraction ---
        const keywordResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: 'You are a search assistant. Extract 2-3 specific Islamic keywords from the user query to search the Quran. Output ONLY the keywords separated by spaces. If no specific keywords, output "Islam".' },
                    { role: 'user', content: userQuery }
                ],
                temperature: 0.1,
            }),
        });
        const keywordData = await keywordResponse.json();
        const searchTerms = keywordData.choices?.[0]?.message?.content || 'Islam';

        // --- STAGE 2: Quran Search (External API) ---
        let quranContext = '';
        try {
            const searchUrl = `https://api.alquran.cloud/v1/search/${encodeURIComponent(searchTerms)}/all/en.asad`;
            const searchRes = await fetch(searchUrl);
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                const matches = (searchData.data?.matches || []).slice(0, 3);
                quranContext = matches.map((m: any) => `Verified Source: ${m.surah.englishName} ${m.surah.number}:${m.numberInSurah}\nText: ${m.text}`).join('\n\n');
            }
        } catch (e) {
            console.error('Quran search failed:', e);
        }

        // --- STAGE 3: Drafting First Pass ---
        const draftResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages: [
                    { 
                        role: 'system', 
                        content: `${env.SHEIKH_PROMPT || SHEIKH_SYSTEM_PROMPT}\n\nVERIFIED CONTEXT:\n${quranContext}`
                    },
                    ...messages,
                ],
                temperature: 0.1, // more stable for drafting
            }),
        });
        const draftData = await draftResponse.json();
        const draftContent = draftData.choices?.[0]?.message?.content || '';

        // --- STAGE 4: Hadith Validation (External Pre-fetch) ---
        // Look for things like "Sahih Bukhari, Hadith 1234" in the draft
        const hadithRegex = /(Sahih Bukhari|Sahih Muslim|Sunan Abu Dawood|Sunan An-Nasai|Sunan Ibn Majah|Jami At-Tirmidhi)[^,.]+, Hadith\s+(\d+)/gi;
        const matches = [...draftContent.matchAll(hadithRegex)];
        
        const collectionMap: Record<string, string> = {
            'sahih bukhari': 'eng-bukhari', 'sahih muslim': 'eng-muslim',
            'sunan abu dawood': 'eng-abudawud', 'sunan an-nasai': 'eng-nasai',
            'sunan ibn majah': 'eng-ibnmajah', 'jami at-tirmidhi': 'eng-tirmidhi'
        };

        let verifiedHadiths = [];
        for (const m of matches.slice(0, 2)) { // Verify top 2 hadiths to stay within time limits
            const collName = m[1].toLowerCase();
            const num = m[2];
            const collId = collectionMap[collName];
            if (collId) {
                try {
                    const hUrl = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${collId}/${num}.json`;
                    const hRes = await fetch(hUrl);
                    if (hRes.ok) {
                        const hData = await hRes.json();
                        const hText = hData.hadiths?.[0]?.text || '';
                        verifiedHadiths.push(`Verification for ${m[1]} #${num}:\n${hText}`);
                    }
                } catch (e) {}
            }
        }

        // --- STAGE 5: Final Grounded Response ---
        const finalResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://islamic-advisor.pages.dev',
                'X-Title': 'Online Sheikh AI',
            },
            body: JSON.stringify({
                model,
                messages: [
                    { 
                        role: 'system', 
                        content: `
                            ${env.SHEIKH_PROMPT || SHEIKH_SYSTEM_PROMPT}

                            VERIFIED CONTEXT (QURAN):
                            ${quranContext}

                            VERIFIED CONTEXT (HADITH SOURCE FILES):
                            ${verifiedHadiths.join('\n\n')}

                            FINAL INSTRUCTION: We have cross-checked the citations against the database. Use the verified results above.
                            If a Hadith number you wanted to use is NOT in the verified list, it might be wrong - either correct it or describe the Hadith without a number.
                        `
                    },
                    ...messages,
                ],
                temperature: 0.7,
            }),
        });

        const data = await finalResponse.json();

        // ── AI Response Error handling ─────────────────────────────────────────
        if (!finalResponse.ok) {
            return new Response(
                JSON.stringify({ error: data.error?.message || 'Artificial Intelligence component failed.' }),
                { status: finalResponse.status, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!data.choices || !data.choices[0]) {
            return new Response(
                JSON.stringify({ error: 'The AI provided an invalid response format.' }),
                { status: 502, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Increment questions_answered counter in RATE_LIMIT KV if bound
        if (env.RATE_LIMIT) {
            try {
                const current = await env.RATE_LIMIT.get('questions_answered') || '0';
                await env.RATE_LIMIT.put('questions_answered', (parseInt(current) + 1).toString());
            } catch (e) {
                console.error('Failed to update questions counter:', e);
            }
        }

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
