/**
 * Step 1: OAuth client config + env selection
 * Goal: Make OAuth2 client configuration and environment selection explicit and hard to misuse.
 */

/**
 * Step 1: OAuth Client Config + Env Selection
 * Pattern: Backend-safe Confidential Client
 */
export interface QfOAuthConfig {
  env: 'prelive' | 'production';
  clientId: string;
  clientSecret: string | null;
  authBaseUrl: string;
  apiBaseUrl: string;
}

/**
 * Reads environment variables and returns the Quran Foundation OAuth configuration.
 * Isolates environments and performs strict validation.
 */
export function getQfOAuthConfig(env: any): QfOAuthConfig {
  // 1. Read environment variables (supporting both the specific requested names and legacy fallbacks)
  const qfEnv = (env.QF_ENV || env.QURAN_ENV || 'prelive').toLowerCase();
  const clientId = env.QF_CLIENT_ID || env.QURAN_CLIENT_ID;
  const clientSecret = env.QF_CLIENT_SECRET || env.QURAN_CLIENT_SECRET;

  // 2. Strict Validation (Step 1 requirement)
  if (!clientId) {
    throw new Error(
      "Missing Quran Foundation API credentials. Request access: https://api-docs.quran.foundation/request-access"
    );
  }

  // 3. Environment Mapping (Step 1 & 6 requirement)
  const isProd = qfEnv === 'production';
  
  // Exact URLs from requirements
  const authBaseUrl = isProd 
    ? 'https://oauth2.quran.foundation' 
    : 'https://prelive-oauth2.quran.foundation';
    
  const apiBaseUrl = isProd 
    ? 'https://apis.quran.foundation' 
    : 'https://apis-prelive.quran.foundation';

  return {
    env: isProd ? 'production' : 'prelive',
    clientId,
    clientSecret: clientSecret || null,
    authBaseUrl,
    apiBaseUrl
  };
}
