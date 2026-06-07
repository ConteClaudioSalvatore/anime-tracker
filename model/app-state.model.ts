import { Anime } from "./anime.model";

export type AppState = {
  [animeName: string]: Anime;
};
