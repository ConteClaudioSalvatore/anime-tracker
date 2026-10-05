import type { TranslationKey } from "./i18n";
import type { Anime } from "../model/anime.model";
import type { Provider } from "../model/provider.model";
import { isAnimeFinished } from "./is-anime-finieshed.util";
import { allowedUrl } from "./provider-runtime";

export type WatchListSortMode = "recent" | "name-asc" | "name-desc";

export const watchListSortOptions: {
  value: WatchListSortMode;
  labelKey: TranslationKey;
}[] = [
  { value: "recent", labelKey: "watch.recent" },
  { value: "name-asc", labelKey: "watch.nameAsc" },
  { value: "name-desc", labelKey: "watch.nameDesc" },
];

/** Unknown totals have no percentage; visited final episodes need not be finished. */
export function watchListProgress(anime: Anime): number | undefined {
  if (!Number.isFinite(anime.total) || anime.total! <= 0) return undefined;
  const episode = Number.isFinite(anime.highestWatchedEpisode)
    ? anime.highestWatchedEpisode
    : 0;
  return Math.min(1, Math.max(0, episode / anime.total!));
}

/** Prefer recorded identity; only infer legacy websites when the match is unique. */
export function watchListProviderName(
  anime: Anime,
  providers: Provider[],
): string | undefined {
  if (providers.length <= 1) return undefined;
  if (anime.providerId !== undefined) {
    return providers.find((provider) => provider.id === anime.providerId)?.name;
  }
  if (!anime.latestVisitedUrl) return undefined;
  const matches = providers.filter((provider) =>
    allowedUrl(provider, anime.latestVisitedUrl),
  );
  return matches.length === 1 ? matches[0].name : undefined;
}

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
