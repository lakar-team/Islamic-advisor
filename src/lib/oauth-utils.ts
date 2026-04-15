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

/**
 * Centrally manages the OAuth login redirection with PKCE.
 * Can be called from any component.
 */
export async function initiateLogin(returnTo: string = 'landing'): Promise<void> {
  try {
    // Fetch configuration
    const configRes = await fetch('/api/oauth/config');
    if (!configRes.ok) throw new Error('Failed to fetch OAuth config');
    const config = await configRes.json();

    // Generate OAuth Parameters
    const state = generateRandomString(16);
    const nonce = generateRandomString(16);
    const verifier = generateRandomString(64);
    const challenge = await generateCodeChallenge(verifier);

    // Store for validation on callback
    localStorage.setItem('oauth_state', state);
    localStorage.setItem('oauth_nonce', nonce);
    localStorage.setItem('oauth_verifier', verifier);

    // Construct Authorization URL
    // Scopes: openid profile bookmark note reading_session offline_access
    const scope = 'openid profile bookmark note reading_session offline_access';
    const authUrl = `${config.oauthBase}/oauth2/auth?` +
      new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope,
        state, // The state contains the returnTo tab info indirectly via validation
        nonce,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        prompt: 'select_account'
      }).toString();

    // The current returnTo tab information is passed via the 'state' parameter 
    // in the previous implementation, but here we'll just store it in state 
    // or let the callback handler know via the search params of the redirect.
    // To maintain compatibility with App.tsx, we'll append it to the state or use a separate param if supported.
    // Actually, Quran.com might only strictly allow 'state'.
    // Let's use the state to store the return tab.
    
    // Update: Encode returnTo into state
    const stateWithReturn = `${state}:${returnTo}`;
    localStorage.setItem('oauth_state', state); // We store the base state for validation
    
    const finalUrl = authUrl.replace(`state=${state}`, `state=${encodeURIComponent(stateWithReturn)}`);
    window.location.href = finalUrl;
  } catch (e) {
    console.error('[OAuth] Failed to initiate login:', e);
    throw e;
  }
}
