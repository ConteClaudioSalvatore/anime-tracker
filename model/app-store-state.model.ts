import { Anime } from "./anime.model";

export type AppStoreState = {
  [animeName: string]: Anime;
};
