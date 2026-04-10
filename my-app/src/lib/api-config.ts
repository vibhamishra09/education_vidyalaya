/**
 * Utility to resolve API and WebSocket URLs.
 * Prefers relative paths to leverage Next.js rewrites, avoiding absolute URL issues in production.
 */

export const API_CONFIG = {
  /**
   * Returns the base API URL. 
   * In the browser, we use relative /api to leverage next.config rewrites.
   * On the server, we use local 127.0.0.1 or environment overrides.
   */
  getApiUrl: () => {
    if (typeof window !== 'undefined') {
      return ''; // Relative path
    }
    return process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  },

  /**
   * Returns the WebSocket URL for the chat/sync features.
   * Derived from the current window location if not explicitly provided.
   */
  getWsUrl: () => {
    if (process.env.NEXT_PUBLIC_CHAT_WS_URL) {
      return process.env.NEXT_PUBLIC_CHAT_WS_URL;
    }

    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      // If we are in dev and API is on 3001, we might need a specific default, 
      // but usually the proxy handles it if it's the same origin.
      return `${protocol}//${host}`;
    }

    return 'ws://127.0.0.1:3001';
  }
};
