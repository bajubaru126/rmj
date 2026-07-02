// API Interceptor to handle 401 responses globally
let originalFetch: typeof fetch | null = null;

export function setupApiInterceptor() {
  // Only setup once
  if (originalFetch) {
    return;
  }

  // Store original fetch
  originalFetch = window.fetch;

  // Override fetch to intercept responses
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch!(...args);
      
      // Check for 401 Unauthorized responses
      if (response.status === 401) {
        console.log('🚫 API returned 401 Unauthorized');
        
        // Only dispatch event if we're making an authenticated request
        const url = typeof args[0] === 'string' ? args[0] : args[0].url;
        const options = args[1];
        const hasAuthHeader = options?.headers && 
          (('Authorization' in options.headers) || 
           (options.headers instanceof Headers && options.headers.has('Authorization')));
        
        if (hasAuthHeader) {
          // Dispatch custom event for token expiration
          window.dispatchEvent(new CustomEvent('token-expired', { 
            detail: { 
              message: 'Token expired or invalid',
              url: url,
              status: response.status
            } 
          }));
        }
      }
      
      return response;
    } catch (error) {
      // Re-throw the error
      throw error;
    }
  };
}

// Function to restore original fetch (for cleanup if needed)
export function restoreOriginalFetch() {
  if (originalFetch) {
    window.fetch = originalFetch;
    originalFetch = null;
    console.log('✅ Original fetch restored');
  }
}