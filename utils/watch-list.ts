import type { Anime } from "../model/anime.model";
import { isAnimeFinished } from "./is-anime-finieshed.util";

export type WatchListSortMode = "recent" | "name-asc" | "name-desc";

export const watchListSortOptions: {
  value: WatchListSortMode;
  label: string;
}[] = [
  { value: "recent", label: "Recently played" },
  { value: "name-asc", label: "A–Z" },
  { value: "name-desc", label: "Z–A" },
];

/** Sort a copy so filtering and rendering never reorder stored history. */
export function sortWatchList(
  entries: [string, Anime][],
  mode: WatchListSortMode,
): [string, Anime][] {
  const playedAt = (anime: Anime) =>
    Number.isFinite(anime.lastPlayedAt) && anime.lastPlayedAt! > 0
      ? anime.lastPlayedAt!
      : 0;
  return [...entries].sort(([a, first], [b, second]) => {
    if (mode === "recent") {
      const difference = playedAt(second) - playedAt(first);
      if (difference) return difference;
    }
    return mode === "name-desc" ? b.localeCompare(a) : a.localeCompare(b);
  });
}

/** A portable summary of all history, independent of website configuration. */
export function watchListSummary(anime: Record<string, Anime>) {
  return sortWatchList(Object.entries(anime), "name-asc").map(
    ([name, item]) => ({
      name,
      highestWatchedEpisode: item.highestWatchedEpisode,
      totalEpisodes: item.total ?? null,
      finished: !!item.finished || isAnimeFinished(item),
    }),
  );
}
