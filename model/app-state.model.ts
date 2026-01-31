export type AppState = {
  [animeName: string]: {
    watched: number[];
    total: number;
  };
};
