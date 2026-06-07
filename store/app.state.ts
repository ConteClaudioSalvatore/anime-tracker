import { AppState } from "@/model";
import { createReducer } from "@/utils/create-reducer.util";
import { on } from "@/utils/on.util";
import { animeUpdate } from "./app.actions";

export const reducer = createReducer<AppState>(
  on(animeUpdate, (state, { payload: { defaultUrl, payload } }) => ({
    ...state,
    [payload.animeTitle]: {
      ...state[payload.animeTitle],
      highestWatchedEpisode:
        (state[payload.animeTitle]?.highestWatchedEpisode ?? 0) >
        payload.episode
          ? state[payload.animeTitle].highestWatchedEpisode
          : payload.episode,
      latestWatchedEpisode: payload.episode,
      latestVisitedUrl: payload.url ?? defaultUrl,
      total: +payload.info["Episodi"],
      episodeProgress: {
        ...state[payload.animeTitle]?.episodeProgress,
        [payload.episode]: {
          progress:
            payload.progress ??
            state[payload.animeTitle]?.episodeProgress?.[payload.episode]
              ?.progress,
          total:
            payload.total ??
            state[payload.animeTitle]?.episodeProgress?.[payload.episode]
              ?.total,
        },
      },
    },
  })),
);
