/**
 * Step 4: Authenticated User API client
 * Goal: Create a helper for Quran Foundation User APIs with automatic 401 refresh logic.
 */

export interface QfApiClientConfig {
  clientId: string;
  apiBaseUrl: string;
}

export class QfApiClient {
  private config: QfApiClientConfig | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<any> | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const res = await fetch('/api/oauth/config');
      const data = await res.json();
      this.config = {
        clientId: data.clientId,
        apiBaseUrl: data.apiBaseUrl || data.api_base || 'https://apis.quran.foundation'
      };
    } catch (e) {
      console.error('[QF-Client] Failed to load config:', e);
    }
  }

  /**
   * Performs an authenticated fetch to the Quran Foundation User APIs.
   * Path should be relative to {apiBaseUrl}/auth/v1/ (e.g. 'bookmarks')
   */
  async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    if (!this.config) {
      await this.init();
      if (!this.config) throw new Error('Client not initialized');
    }

    const url = `${this.config.apiBaseUrl}/auth/v1/${path}`;
    const accessToken = localStorage.getItem('quran_access_token');

    const headers = {
      ...(options.headers || {}),
      'x-auth-token': accessToken || '',
      'x-client-id': this.config.clientId,
    };

    let response = await fetch(url, { ...options, headers });

    // Step 4: Retry logic for 401 (exactly one refresh + one retry)
    if (response.status === 401) {
      const refreshToken = localStorage.getItem('quran_refresh_token');
      const idToken = localStorage.getItem('quran_id_token');
      // Use sub from id_token as sessionId for stampede prevention
      const sessionId = idToken ? this.decodeJwt(idToken)?.sub : 'default';

      if (refreshToken) {
        try {
          console.log('[QF-Client] Token expired, attempting refresh...');
          const newTokens = await this.refresh(sessionId, refreshToken);
          
          // Retry once with new token
          const retryHeaders = {
            ...headers,
            'x-auth-token': newTokens.access_token,
          };
          response = await fetch(url, { ...options, headers: retryHeaders });
        } catch (e) {
          console.error('[QF-Client] Refresh failed:', e);
          // Still return the original 401 or the new failure
        }
      }
    }

    return response;
  }

  /**
   * Step 5: Refresh token handling with stampede prevention (client-side lock)
   */
  private async refresh(sessionId: string, refreshToken: string): Promise<any> {
    if (this.isRefreshing) return this.refreshPromise;

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const res = await fetch('/api/oauth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, refreshToken })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to refresh access token');

        // Update local storage
        localStorage.setItem('quran_access_token', data.access_token);
        if (data.refresh_token) localStorage.setItem('quran_refresh_token', data.refresh_token);
        
        return data;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private decodeJwt(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }
}

export const qfApiClient = new QfApiClient();
