export type AnimePayload = {
  animeTitle: string;
  episode: number;
  info?: Record<string, string>;
  episodeCount?: number;
  providerId?: number;
  /** Remote cover reference; image bytes are never persisted. */
  coverUrl?: string;
  lastPlayedAt?: number;
  progress?: number;
  total?: number;
  url?: string;
};
