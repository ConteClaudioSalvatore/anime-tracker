import { AppStoreState } from "@/model";
import { createReducer } from "@/utils/create-reducer.util";
import { on } from "@/utils/on.util";
import {
  animeUpdated,
  toggleAnimeFinished,
  removeAnime,
  upsertAnime,
  upsertProvider,
  removeProvider,
} from "./app.actions";

import { upsertProviderList } from '@/utils/provider-runtime';

export const reducer = createReducer<AppStoreState>(
  on(animeUpdated, (state, { payload: { defaultUrl, payload } }) => ({
    ...state,
    anime: {
      ...state.anime,
      [payload.animeTitle]: {
        ...state.anime[payload.animeTitle],
        name: payload.animeTitle,
        highestWatchedEpisode:
          (state.anime[payload.animeTitle]?.highestWatchedEpisode ?? 0) >
          payload.episode
            ? state.anime[payload.animeTitle].highestWatchedEpisode
            : payload.episode,
        latestWatchedEpisode: payload.episode,
        latestVisitedUrl: payload.url ?? defaultUrl,
        providerId: payload.providerId ?? state.anime[payload.animeTitle]?.providerId,
        total: payload.episodeCount ?? (payload.info?.["Episodi"] ? +payload.info["Episodi"] : state.anime[payload.animeTitle]?.total),
        episodeProgress: {
          ...state.anime[payload.animeTitle]?.episodeProgress,
          [payload.episode]: {
            progress:
              payload.progress ??
              state.anime[payload.animeTitle]?.episodeProgress?.[
                payload.episode
              ]?.progress ?? 0,
            total:
              payload.total ??
              state.anime[payload.animeTitle]?.episodeProgress?.[
                payload.episode
              ]?.total ?? 0,
          },
        },
      },
    },
  })),
  on(removeAnime, (state, { payload: animeName }) => ({
    ...state,
    anime: Object.fromEntries(
      Object.entries(state.anime).filter(([k]) => k !== animeName),
    ),
  })),
  on(toggleAnimeFinished, (state, { payload: animeName }) => ({
    ...state,
    anime: {
      ...state.anime,
      [animeName]: {
        ...state.anime[animeName],
        finished: !state.anime[animeName]?.finished,
      },
    },
  })),
  on(upsertAnime, (state, { payload: { animeName, episode } }) => ({
    ...state,
    anime: {
      ...state.anime,
      [animeName]: {
        ...state.anime[animeName],
        latestWatchedEpisode: episode,
        highestWatchedEpisode: episode,
      },
    },
  })),
  on(upsertProvider, (state, { payload }) => {
    return {
      ...state,
      providers: upsertProviderList(state.providers, payload),
    };
  }),
  on(removeProvider, (state, { payload: providerId }) => ({
    ...state,
    providers: state.providers.filter((p) => p.id !== providerId),
  })),
);
