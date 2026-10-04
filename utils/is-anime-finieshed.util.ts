import type { Anime } from "../model/anime.model";

/** Legacy history derives automatic completion from its saved final episode. */
export function isPlaybackFinished(anime: Anime): boolean {
  if (
    !(Number.isFinite(anime.total) && anime.total! > 0) ||
    anime.highestWatchedEpisode !== anime.total
  )
    return false;
  if (anime.playbackFinished !== undefined) return anime.playbackFinished;
  const progress = anime.episodeProgress?.[anime.highestWatchedEpisode];
  return (
    Number.isFinite(progress?.progress) &&
    Number.isFinite(progress?.total) &&
    progress!.total > 0 &&
    progress!.progress > progress!.total * 0.9
  );
}

export function isAnimeFinished(anime: Anime): boolean {
  return (
    Number.isFinite(anime.total) &&
    anime.total! > 0 &&
    anime.highestWatchedEpisode === anime.total &&
    (!!anime.finished || isPlaybackFinished(anime))
  );
}
