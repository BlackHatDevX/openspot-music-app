import { NextRequest, NextResponse } from 'next/server';
import { requestQueue, fetchWithRetry } from '@/lib/request-queue';

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
      }, 3, 10000); // 3 retries, 10 second timeout for streams

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