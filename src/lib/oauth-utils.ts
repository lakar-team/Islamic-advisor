/**
 * Utility functions for OAuth 2.0 PKCE (Proof Key for Code Exchange)
 * and OpenID Connect flow.
 */

/**
 * Generates a random string of the specified length.
 */
export function generateRandomString(length: number = 32): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Helper to perform Base64URL encoding on a Uint8Array or Buffer.
 */
export function base64UrlEncode(array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...array));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generates a code_challenge from a code_verifier using SHA-256.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Decodes a JWT payload without validation.
 */
export function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('[OAuth] Failed to decode JWT:', e);
    return null;
  }
}

/**
 * Validates the state parameter returned by the provider.
 */
export function validateState(returnedState: string | null): boolean {
  const storedState = localStorage.getItem('oauth_state');
  return !!storedState && returnedState === storedState;
}

/**
 * Validates the nonce parameter in the ID token.
 */
export function validateNonce(idToken: string, storedNonce: string | null): boolean {
  if (!storedNonce) return true; // Nonce optional but recommended
  const payload = decodeJwt(idToken);
  return payload && payload.nonce === storedNonce;
}
