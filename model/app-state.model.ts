export type AppState = {
  [animeName: string]: {
    latestWatchedEpisode: number;
    total: number;
  };
};
