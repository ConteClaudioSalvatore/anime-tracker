import { AnimePayload } from "@/model";
import { createAction } from "@/utils/create-action.util";

export const animeUpdate = createAction(
  "@app/anime-update",
  (defaultUrl: string, payload: AnimePayload) => ({
    payload: { defaultUrl, payload },
  }),
);
