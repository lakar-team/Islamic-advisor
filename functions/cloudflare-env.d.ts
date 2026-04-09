// Cloudflare Workers KV type stub for TypeScript in the functions/ directory.
// This matches the real Cloudflare KV runtime API.
declare interface KVNamespace {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
}

// Cloudflare Pages environment bindings
declare interface Env {
    // KV Namespaces
    RATE_LIMIT: KVNamespace;
    // AI
    AI_API_KEY: string;
    AI_API_URL: string;
    AI_MODEL: string;
    // Quran.com OAuth2
    // prelive-oauth2.quran.foundation (stable/test) | oauth2.quran.foundation (main/prod)
    QURAN_OAUTH_BASE_URL: string;
    QURAN_CLIENT_ID: string;
    QURAN_CLIENT_SECRET: string;
    QURAN_REDIRECT_URI: string;
    // Stripe
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
}
