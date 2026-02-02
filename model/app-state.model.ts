export type AppState = {
  [animeName: string]: {
    latestWatchedEpisode: number;
    latestVisitedUrl: string;
    highestWatchedEpisode: number;
    episodeProgress?: Record<number, number>;
    total?: number;
  };
};
