type Initializable<T extends object, TInitialized extends boolean> = {
  [k in keyof T]: TInitialized extends true ? T[k] : T[k] | null;
};

export type Provider<TInitialized extends boolean = false> = {
  id: string;
  name: string;
  origin: string;
  animePageOrigin: string;
  whiteListedOrigins: string[];
} & Initializable<
  {
    animeNameSelector: string;
    episodeNameSelector: string;
    episodeNumberSelector: string;
    totalEpisodesSelector: string;
    playerSelector: string;
  },
  TInitialized
>;
