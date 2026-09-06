import { AppStoreState } from "@/model";

export function isAnimeFinished(anime: AppStoreState[string]): boolean {
  const progress = anime.episodeProgress?.[anime.highestWatchedEpisode];
  const watchedFor90Percent =
    progress?.progress !== undefined &&
    progress.progress > progress.total * 0.9;
  return (
    anime.highestWatchedEpisode === (anime.total ?? -1) &&
    // if watched for more than 90% we consider the episode finished
    (anime.finished || watchedFor90Percent)
  );
}
