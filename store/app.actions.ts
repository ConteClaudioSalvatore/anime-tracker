import { AnimePayload } from "@/model";
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
export const markAnimeFinished = createAction(
  "@app/mark-anime-finished",
  (payload: string) => ({ payload }),
);
export const upsertAnime = createAction(
  "@app/upsert-anime",
  (animeName: string, episode: number) => ({ payload: { animeName, episode } }),
);
