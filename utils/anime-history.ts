import type { Anime } from "../model/anime.model";
import type { AnimePayload } from "../model/anime-payload.model";
import { coverImageUrl } from "./cover-image";
import { isPlaybackFinished } from "./is-anime-finieshed.util";

/** Merge one title's history independently of the website used to watch it. */
export function mergeAnimeHistory(
  previous: Anime | undefined,
  payload: AnimePayload,
  defaultUrl: string,
): Anime {
  const totals = [
    previous?.total,
    payload.episodeCount,
    payload.info?.Episodi ? Number(payload.info.Episodi) : undefined,
  ].filter((value): value is number => Number.isInteger(value) && value! > 0);
  const total = totals.length ? Math.max(...totals) : undefined;
  const playbackDate =
    Number.isFinite(payload.lastPlayedAt) && payload.lastPlayedAt! > 0
      ? payload.lastPlayedAt
      : undefined;
  const advancing =
    playbackDate !== undefined &&
    playbackDate > (previous?.lastPlayedAt ?? 0) &&
    Number.isFinite(payload.progress) &&
    payload.progress! >= 0 &&
    Number.isFinite(payload.total) &&
    payload.total! > 0;
  const playbackFinished = advancing
    ? payload.episode === total && payload.progress! > payload.total! * 0.9
    : total !== previous?.total
      ? false
      : previous
        ? isPlaybackFinished(previous)
        : false;
  const saved = previous?.episodeProgress?.[payload.episode];
  return {
    ...previous,
    name: payload.animeTitle,
    highestWatchedEpisode: Math.max(
      previous?.highestWatchedEpisode ?? 0,
      payload.episode,
    ),
    latestWatchedEpisode: payload.episode,
    latestVisitedUrl: payload.url ?? defaultUrl,
    providerId: payload.providerId ?? previous?.providerId,
    coverUrl:
      coverImageUrl(payload.coverUrl) ?? coverImageUrl(previous?.coverUrl),
    lastPlayedAt:
      playbackDate === undefined
        ? previous?.lastPlayedAt
        : Math.max(playbackDate, previous?.lastPlayedAt ?? 0),
    finished: advancing ? false : previous?.finished,
    playbackFinished,
    total,
    episodeProgress: {
      ...previous?.episodeProgress,
      [payload.episode]: {
        progress: payload.progress ?? saved?.progress ?? 0,
        total: payload.total ?? saved?.total ?? 0,
      },
    },
  };
}
