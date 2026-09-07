import { AnimePayload, Provider } from "@/model";
import { createAction } from "@/utils/create-action.util";

export const animeUpdated = createAction(
  "@app/anime-update",
  (defaultUrl: string, payload: AnimePayload) => ({
    payload: { defaultUrl, payload },
  }),
);
export const removeAnime = createAction(
  "@app/remove-anime",
  (payload: string) => ({ payload }),
);
export const toggleAnimeFinished = createAction(
  "@app/toggle-anime-finished",
  (payload: string) => ({ payload }),
);
export const upsertAnime = createAction(
  "@app/upsert-anime",
  (animeName: string, episode: number) => ({ payload: { animeName, episode } }),
);

export const upsertProvider = createAction(
  "@app/add-provider",
  (provider: Provider) => ({ payload: provider }),
);

export const removeProvider = createAction(
  "@app/remove-provider",
  (providerId: number) => ({ payload: providerId }),
);
