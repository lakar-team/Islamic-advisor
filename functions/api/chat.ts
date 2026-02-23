export const onRequestPost = async (context: any) => {
    const { request, env } = context;

    // 1. Basic Rate Limiting check (Cloudflare KV would be better here)
    // For now, we assume the client-side rate limit is the first line of defense

    try {
        const { messages } = await request.json();

        // 2. Call AI Provider (e.g., OpenAI or Gemini)
        // This is a generic implementation for a chat completion
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.AI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4-turbo-preview", // or any other model
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
