export interface Track {
  id: number;
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

export interface SearchResponse {
  tracks: Track[];
  pagination: {
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface SearchParams {
  q: string;
  offset?: number;
  type?: 'track' | 'album' | 'artist';
} 