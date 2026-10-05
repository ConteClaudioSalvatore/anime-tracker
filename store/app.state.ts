import { AppStoreState } from "@/model";
import { createReducer } from "@/utils/create-reducer.util";
import { on } from "@/utils/on.util";
import {
  animeUpdated,
  animeCoverUpdated,
  toggleAnimeFinished,
  removeAnime,
  upsertAnime,
  upsertProvider,
  removeProvider,
} from "./app.actions";

import { upsertProviderList } from "@/utils/provider-runtime";
import { coverImageUrl } from "@/utils/cover-image";
import { mergeAnimeHistory } from "@/utils/anime-history";
import { isAnimeFinished } from "@/utils/is-anime-finieshed.util";

export const reducer = createReducer<AppStoreState>(
  on(animeUpdated, (state, { payload: { defaultUrl, payload } }) => ({
    ...state,
    anime: {
      ...state.anime,
      [payload.animeTitle]: mergeAnimeHistory(
        state.anime[payload.animeTitle],
        payload,
        defaultUrl,
      ),
    },
  })),
  on(animeCoverUpdated, (state, { payload: { animeTitle, coverUrl } }) => {
    const anime = state.anime[animeTitle];
    const reference = coverImageUrl(coverUrl);
    if (!anime || !reference || anime.coverUrl === reference) return state;
    return {
      ...state,
      anime: {
        ...state.anime,
        [animeTitle]: { ...anime, coverUrl: reference },
      },
    };
  }),
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
        finished: !(
          state.anime[animeName]?.finished ||
          (state.anime[animeName] && isAnimeFinished(state.anime[animeName]))
        ),
        playbackFinished: false,
      },
    },
  })),
  on(upsertAnime, (state, { payload: { animeName, episode, total } }) => ({
    ...state,
    anime: {
      ...state.anime,
      [animeName]: {
        ...state.anime[animeName],
        ...(total !== undefined ? { total: total ?? undefined } : {}),
        latestWatchedEpisode: episode,
        highestWatchedEpisode: episode,
        playbackFinished: false,
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
