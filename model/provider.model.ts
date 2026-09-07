type Initializable<T extends object, TInitialized extends boolean> = {
  [k in keyof T]: TInitialized extends true ? T[k] : T[k] | null;
};

export type Provider<TInitialized extends boolean = true> = {
  id: number;
  isDefault: boolean;
  whiteListedOrigins: string[];
} & Initializable<
  {
    name: string;
    origin: string;
    animePageOrigin: string;
    animeNameSelector: string;
    episodeNameSelector: string;
    episodeNumberSelector: string;
    totalEpisodesSelector: string;
    playerSelector: string;
  },
  TInitialized
>;
