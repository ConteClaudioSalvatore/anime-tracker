export type AnimePayload = {
  animeTitle: string;
  episode: number;
  info?: Record<string, string>;
  episodeCount?: number;
  providerId?: number;
  lastPlayedAt?: number;
  progress?: number;
  total?: number;
  url?: string;
};
