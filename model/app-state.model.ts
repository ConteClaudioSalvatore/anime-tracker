export type AppState = {
  [animeName: string]: {
    latestWatchedEpisode: number;
    latestVisitedUrl: string;
    total?: number;
  };
};
