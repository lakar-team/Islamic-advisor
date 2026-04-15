import { getQfOAuthConfig } from './qf-oauth-config';

/**
 * Step 2: PKCE + auth URL + secure state
 * Goal: Safely redirect users with correct params and persist the verifier.
 */

export interface AuthorizationParams {
  redirectUri: string;
  scopes?: string[];
  state?: string; // Optional user context
}

export interface AuthorizationResult {
  url: string;
  state: string;
  nonce: string;
}

/**
 * Handles OAuth2 logic including PKCE and Code Exchange.
 */
export class QfOAuthService {
  private config: any;
  private kv: KVNamespace;

  constructor(env: any) {
    this.config = getQfOAuthConfig(env);
    this.kv = env.RATE_LIMIT; // Using existing KV namespace for session storage
  }

  /**
   * Step 2: Builds the authorization URL and persists flow parameters in KV.
   */
  async buildAuthorizationUrl(params: AuthorizationParams): Promise<AuthorizationResult> {
    const stateValue = this.generateRandomString(16);
    const nonce = this.generateRandomString(16);
    const codeVerifier = this.generateRandomString(64);
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    // Combine user state with random state if provided
    const state = params.state ? `${stateValue}:${params.state}` : stateValue;

    // Persist flow data server-side (KV) before redirect
    // TTL of 10 minutes for the login flow
    await this.kv.put(`oauth_flow:${stateValue}`, JSON.stringify({
      codeVerifier,
      nonce,
      redirectUri: params.redirectUri,
      state: stateValue
    }), { expirationTtl: 600 });

    const scope = params.scopes?.join(' ') || 'openid user bookmark reading_session offline_access';
    
    const url = `${this.config.authBaseUrl}/oauth2/auth?` +
      new URLSearchParams({
        response_type: 'code',
        client_id: this.config.clientId,
        redirect_uri: params.redirectUri,
        scope,
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      }).toString();

    return { url, state, nonce };
  }

  /**
   * Step 3: Exchanges authorization code for tokens.
   */
  async exchangeAuthorizationCode(params: { code: string; state: string; }): Promise<any> {
    const [stateValue] = params.state.split(':');
    
    // 1. Retrieve and validate flow data (CSRF protection)
    const storedFlowData = await this.kv.get(`oauth_flow:${stateValue}`);
    if (!storedFlowData) {
      throw new Error('Invalid or expired OAuth state');
    }
    const flowData = JSON.parse(storedFlowData);
    await this.kv.delete(`oauth_flow:${stateValue}`); // One-time use

    // 2. Perform token exchange
    // Use client_secret_basic for confidential clients
    const credentials = btoa(`${this.config.clientId}:${this.config.clientSecret}`);
    
    const tokenParams = {
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: flowData.redirectUri,
      code_verifier: flowData.codeVerifier
    };

    const response = await fetch(`${this.config.authBaseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json'
      },
      body: new URLSearchParams(tokenParams).toString(),
    });
    
    const tokens: any = await response.json();

    if (!response.ok) {
      console.error('[QF-OAuth] Token exchange failed', {
        status: response.status,
        error: tokens.error,
        error_description: tokens.error_description
      });
      throw new Error('Failed to exchange authorization code for tokens');
    }

    return {
      ...tokens,
      api_base: this.config.apiBaseUrl,
      client_id: this.config.clientId,
      nonce: flowData.nonce // Return for validation
    };
  }

  /**
   * Step 5: Refreshes the access token using a refresh token.
   * Includes stampede prevention logic using KV locking.
   */
  async refreshAccessToken(sessionId: string, refreshToken: string): Promise<any> {
    const envPrefix = this.config.env;
    const lockKey = `lock:refresh:${envPrefix}:${sessionId}`;
    const tokenKey = `session:tokens:${envPrefix}:${sessionId}`;

    // 1. Stampede Prevention: Check for an active refresh lock
    const existingLock = await this.kv.get(lockKey);
    if (existingLock) {
      // Wait and poll for the updated token (max 5 seconds)
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const updatedTokens = await this.kv.get(tokenKey);
        if (updatedTokens) {
          const parsed = JSON.parse(updatedTokens);
          // Verify it's actually a new token (you might want to store a version or timestamp)
          return parsed;
        }
      }
      throw new Error('Refresh stampede timeout');
    }

    // 2. Set lock (TTL 30 seconds to prevent deadlocks)
    await this.kv.put(lockKey, 'true', { expirationTtl: 30 });

    try {
      const credentials = btoa(`${this.config.clientId}:${this.config.clientSecret}`);
      
      const response = await fetch(`${this.config.authBaseUrl}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }).toString(),
      });

      const tokens: any = await response.json();

      if (!response.ok) {
        console.error('[QF-OAuth] Refresh failed', { status: response.status });
        throw new Error('Failed to refresh access token');
      }

      const result = {
        ...tokens,
        api_base: this.config.apiBaseUrl,
        client_id: this.config.clientId
      };

      // 3. Update session storage if applicable (Step 5 requirement)
      await this.kv.put(tokenKey, JSON.stringify(result), { expirationTtl: 3600 * 24 * 7 }); // 1 week

      return result;
    } finally {
      // 4. Release lock
      await this.kv.delete(lockKey);
    }
  }

  // --- Helpers ---

  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charset.length];
    }
    return result;
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    
    // Robust Base64URL encoding for Cloudflare Workers
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/, '');
  }
}
