import { AppStoreState } from "@/model";
import { createReducer } from "@/utils/create-reducer.util";
import { on } from "@/utils/on.util";
import {
    animeUpdated,
    toggleAnimeFinished,
    removeAnime,
    upsertAnime,
} from "./app.actions";

export const reducer = createReducer<AppStoreState>(
  on(animeUpdated, (state, { payload: { defaultUrl, payload } }) => ({
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
  on(removeAnime, (state, { payload: animeName }) =>
    Object.fromEntries(Object.entries(state).filter(([k]) => k !== animeName)),
  ),
  on(toggleAnimeFinished, (state, { payload: animeName }) => ({
    ...state,
    [animeName]: { ...state[animeName], finished: !state[animeName]?.finished },
  })),
  on(upsertAnime, (state, { payload: { animeName, episode } }) => ({
    ...state,
    [animeName]: {
      ...state[animeName],
      latestWatchedEpisode: episode,
      highestWatchedEpisode: episode,
    },
  })),
);
