import { Anime } from "./anime.model";
import { Provider } from "./provider.model";

export type AppStoreState = {
  anime: {
    [animeName: string]: Anime;
  };
  providers: Provider[];
};
