import { NextRequest, NextResponse } from 'next/server';

// Shared request queue to handle all external API requests
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
        signal: AbortSignal.timeout(10000), // 10 second timeout for streams
      });
      
      if (response.ok) {
        return response;
      }
      
      // If it's a server error (5xx) or rate limit (429), retry
      if (response.status >= 500 || response.status === 429) {
        if (attempt === maxRetries) {
          throw new Error(`API request failed with status ${response.status} after ${maxRetries} attempts`);
        }
        
        // Exponential backoff: wait 0.5s, 1s, 2s for streams (faster than search)
        const delay = Math.pow(2, attempt - 1) * 500;
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
      const delay = Math.pow(2, attempt - 1) * 500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const trackId = searchParams.get('trackId');

    if (!trackId) {
      return NextResponse.json(
        { error: 'Track ID is required' },
        { status: 400 }
      );
    }

    // Queue the request to prevent concurrent issues
    const data = await requestQueue.add(async () => {
      console.log(`🎵 Queued stream request: ${trackId}`);
      
      const response = await fetchWithRetry(`https://dab.yeet.su/api/stream?trackId=${trackId}`, {
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

      const responseData = await response.json();

      if (!responseData.url) {
        throw new Error('No stream URL returned from API');
      }

      // Test the streaming URL to ensure it's accessible and force full download
      console.log(`🔗 Testing stream URL for: ${trackId}`);
      const streamTestResponse = await fetch(responseData.url, {
        method: 'HEAD', // Use HEAD to just check if the URL is valid without downloading
        headers: {
          'Range': 'bytes=0-', // Request full file to avoid partial content
          'Accept': 'audio/*',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(5000), // Quick 5 second timeout for URL validation
      });

      if (!streamTestResponse.ok) {
        console.warn(`⚠️ Stream URL test failed for ${trackId}: ${streamTestResponse.status}`);
        // Don't throw error, just log warning - the URL might still work for audio playback
      } else {
        console.log(`✅ Stream URL validated for: ${trackId}`);
      }

      console.log(`✅ Stream completed: ${trackId}`);
      return responseData;
    });

    return NextResponse.json({ 
      url: data.url,
      trackId: trackId 
    });

  } catch (error) {
    console.error('Stream API error:', error);
    return NextResponse.json(
      { error: 'Failed to get stream URL' },
      { status: 500 }
    );
  }
} 