export type AnimePayload = {
  animeTitle: string;
  episode: number;
  info: Record<string, string>;
  progress: number;
  total: number;
  url?: string;
};
