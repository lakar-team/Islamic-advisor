// Cloudflare Workers KV type stub for TypeScript in the functions/ directory.
// This matches the real Cloudflare KV runtime API.
declare interface KVNamespace {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
}
