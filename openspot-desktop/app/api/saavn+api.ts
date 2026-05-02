import axios from 'axios';

const JIO_SAAVN_API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
];

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  
  if (!endpoint) {
    return Response.json({ error: 'Missing endpoint parameter' }, { status: 400 });
  }

  const url = new URL(JIO_SAAVN_API_URL);
  url.searchParams.append('__call', endpoint);
  url.searchParams.append('_format', 'json');
  url.searchParams.append('_marker', '0');
  url.searchParams.append('api_version', '4');
  url.searchParams.append('ctx', 'web6dot0');

  // Forward all other params except 'endpoint'
  searchParams.forEach((value, key) => {
    if (key !== 'endpoint') {
      url.searchParams.append(key, value);
    }
  });

  try {
    const response = await axios.get(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': getRandomUserAgent(),
      },
      timeout: 15000,
    });

    return Response.json(response.data);
  } catch (error) {
    console.error('Saavn proxy error:', error);
    return Response.json(
      { error: 'Failed to fetch from JioSaavn' },
      { status: 500 }
    );
  }
}
