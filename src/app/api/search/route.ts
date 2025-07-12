import { NextRequest, NextResponse } from 'next/server';
import { SearchResponse } from '@/types/music';
import { requestQueue, fetchWithRetry } from '@/lib/request-queue';

const API_BASE_URL = 'https://dab.yeet.su/api';

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
      }, 3, 15000); // 3 retries, 15 second timeout

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