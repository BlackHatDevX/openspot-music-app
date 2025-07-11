import { NextRequest, NextResponse } from 'next/server';
import { SearchResponse } from '@/types/music';

const API_BASE_URL = 'https://dab.yeet.su/api';

// Request queue to handle concurrent requests
class RequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;
  private readonly maxConcurrent = 1; // Only allow 1 concurrent request to external API
  private activeRequests = 0;

  async add<T>(requestFn: () => Promise<T>): Promise<T> {
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

const requestQueue = new RequestQueue();

// Retry function with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(15000), // 15 second timeout per request
      });
      
      if (response.ok) {
        return response;
      }
      
      // If it's a server error (5xx) or rate limit (429), retry
      if (response.status >= 500 || response.status === 429) {
        if (attempt === maxRetries) {
          throw new Error(`API request failed with status ${response.status} after ${maxRetries} attempts`);
        }
        
        // Exponential backoff: wait 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
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
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const offset = searchParams.get('offset') || '0';
  const type = searchParams.get('type') || 'track';

  if (!query) {
    return NextResponse.json(
      { error: 'Search query is required' },
      { status: 400 }
    );
  }

  try {
    const apiUrl = `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&offset=${offset}&type=${type}`;
    
    // Queue the request to prevent concurrent issues
    const data = await requestQueue.add(async () => {
      console.log(`🔍 Queued search request: ${query}`);
      
      const response = await fetchWithRetry(apiUrl, {
        method: 'GET',
        headers: {
          'accept': '*/*',
          'accept-language': 'en-GB,en;q=0.7',
          'cache-control': 'no-cache',
          'pragma': 'no-cache',
          'referer': 'https://dab.yeet.su/',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
        },
      });

      const responseData: SearchResponse = await response.json();
      console.log(`✅ Search completed: ${query} - Found ${responseData.tracks?.length || 0} tracks`);
      return responseData;
    });
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search results' },
      { status: 500 }
    );
  }
}