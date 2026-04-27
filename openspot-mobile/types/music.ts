export interface Track {
  id: string | number;
  provider?: 'saavn' | 'ytmusic';
  title: string;
  artist: string;
  artistId: number;
  albumTitle: string;
  albumCover: string;
  albumId: string;
  releaseDate: string;
  genre: string;
  duration: number;
  audioQuality: {
    maximumBitDepth: number;
    maximumSamplingRate: number;
    isHiRes: boolean;
  };
  version: string | null;
  label: string;
  labelId: number;
  upc: string;
  mediaCount: number;
  parental_warning: boolean;
  streamable: boolean;
  purchasable: boolean;
  previewable: boolean;
  genreId: number;
  genreSlug: string;
  genreColor: string;
  releaseDateStream: string;
  releaseDateDownload: string;
  maximumChannelCount: number;
  images: {
    small: string;
    thumbnail: string;
    large: string;
    back: string | null;
  };
  isrc: string;
}

export interface Album {
  id: string;
  name: string;
  description: string;
  year: number | null;
  type: string;
  playCount: number | null;
  language: string;
  explicitContent: boolean;
  artists: {
    primary: Array<{
      id: string;
      name: string;
      role: string;
      type: string;
      image: Array<{ quality: string; url: string }>;
      url: string;
    }>;
    featured: Array<{
      id: string;
      name: string;
      role: string;
      type: string;
      image: Array<{ quality: string; url: string }>;
      url: string;
    }>;
    all: Array<{
      id: string;
      name: string;
      role: string;
      type: string;
      image: Array<{ quality: string; url: string }>;
      url: string;
    }>;
  };
  songCount: number | null;
  url: string;
  image: Array<{ quality: string; url: string }>;
  images: {
    small: string;
    thumbnail: string;
    large: string;
  };
}

export interface Artist {
  id: string;
  name: string;
  url: string;
  followerCount: number | null;
  isVerified: boolean;
  dominantLanguage: string;
  dominantType: string;
  role: string;
  image: Array<{ quality: string; url: string }>;
  images: {
    small: string;
    thumbnail: string;
    large: string;
  };
}

export interface PlaylistSearchItem {
  id: string;
  name: string;
  description: string;
  type: string;
  songCount: number | null;
  followerCount: number | null;
  explicitContent: boolean;
  language: string;
  url: string;
  image: Array<{ quality: string; url: string }>;
  images: {
    small: string;
    thumbnail: string;
    large: string;
  };
}

export interface SearchResponse {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: PlaylistSearchItem[];
  pagination: {
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface SearchParams {
  q: string;
  offset?: number;
  type?: 'track' | 'album' | 'artist' | 'playlist';
} 