import { proxyManager } from './proxy-manager';

// Shared request queue to handle all external API requests
export class RequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private readonly maxConcurrent = 1; // Only allow 1 concurrent request to external API
  private activeRequests = 0;
  private statsLogged = false;

  async add<T>(requestFn: () => Promise<T>): Promise<T> {
    // Log proxy stats on first use
    if (!this.statsLogged) {
      const stats = proxyManager.getProxyStats();
      console.log(`📊 Proxy Manager Stats:`, stats);
      this.statsLogged = true;
    }

    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          this.activeRequests++;
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeRequests--;
          this.processNext();
        }
      });
      
      this.processNext();
    });
  }

  private processNext() {
    if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const nextRequest = this.queue.shift();
    if (nextRequest) {
      nextRequest();
    }
  }
}

// Retry function with exponential backoff and proxy support
export async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  maxRetries = 3,
  timeoutMs = 15000
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Get proxy configuration for this request
      const proxyOptions = proxyManager.createProxyFetchOptions(options);
      
      const response = await fetch(url, {
        ...proxyOptions,
        signal: AbortSignal.timeout(timeoutMs),
      });
      
      if (response.ok) {
        return response;
      }
      
      // If it's a server error (5xx) or rate limit (429), retry
      if (response.status >= 500 || response.status === 429) {
        if (attempt === maxRetries) {
          throw new Error(`API request failed with status ${response.status} after ${maxRetries} attempts`);
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Retrying request to ${url} in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For other errors (4xx), don't retry
      throw new Error(`API request failed with status ${response.status}`);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`⏳ Retrying request to ${url} in ${delay}ms (attempt ${attempt}/${maxRetries}) - Error: ${error}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

// Create a shared instance
export const requestQueue = new RequestQueue(); 