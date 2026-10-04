type Initializable<T extends object, TInitialized extends boolean> = {
  [k in keyof T]: TInitialized extends true ? T[k] : T[k] | null;
};

export type Provider<TInitialized extends boolean = true> = {
  id: number;
  isDefault: boolean;
  whiteListedOrigins: string[];
  configurationVersion?: 2;
  pageRule?: { origin: string; pathPrefix: string; queryKeys: string[] };
  player?: { selector: string; framePath: string[] };
  verification?: { progress: boolean; resume: boolean; checkedAt: string };
  examplePages?: string[];
} & Initializable<
  {
    name: string;
    origin: string;
    seriesPageOrigin: string;
    seriesNameSelector: string;
    episodeNumberSelector: string;
    totalEpisodesSelector: string;
    isPlayerSupported: boolean;
  },
  TInitialized
>;

export type SaveProviderResult =
  { success: true; provider: Provider } | { success: false; message: string };
