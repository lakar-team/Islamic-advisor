export const onRequestPost = async (context: any) => {
    const { request, env } = context;

    // 1. Basic Rate Limiting check (Cloudflare KV would be better here)
    // For now, we assume the client-side rate limit is the first line of defense

    try {
        const { messages } = await request.json();

        // Use OpenRouter endpoint or fallback to OpenAI
        const apiUrl = env.AI_API_URL || "https://openrouter.ai/api/v1/chat/completions";
        const model = env.AI_MODEL || "google/gemini-2.0-flash-001"; // Highly recommended for speed/cost

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.AI_API_KEY}`,
                "HTTP-Referer": "https://islamic-advisor.pages.dev", // Optional for OpenRouter
                "X-Title": "Online Sheikh AI", // Optional for OpenRouter
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: env.SHEIKH_PROMPT },
                    ...messages
                ],
                temperature: 0.7,
            })
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: "Operation failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
