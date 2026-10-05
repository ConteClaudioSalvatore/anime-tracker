import { useAppTranslation } from "@/hooks/use-app-translation";
import type { Anime } from "@/model";
import { toggleAnimeFinished } from "@/store/app.actions";
import {
  AppStore,
  isAnimeFinished,
  onAnimeRemove,
  onClearHistory,
  StoreContext,
} from "@/utils";
import { AppStateContext } from "@/utils/app-state.util";
import { sortWatchList, type WatchListSortMode } from "@/utils/watch-list";
import { useRouter } from "expo-router";
import { useContext, useMemo, useState } from "react";

export function useWatchList() {
  const t = useAppTranslation();
  const { state, stateChanged } = useContext(StoreContext);
  const { updateState } = useContext(AppStateContext);
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [onlyInProgress, setOnlyInProgress] = useState(true);
  const [sortMode, setSortMode] = useState<WatchListSortMode>("recent");
  const hasHistory = Object.keys(state.anime).length > 0;
  const items = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return sortWatchList(
      Object.entries(state.anime).filter(
        ([name, anime]) =>
          name.toLowerCase().includes(query) &&
          (!onlyInProgress || !(isAnimeFinished(anime) || anime.finished)),
      ),
      sortMode,
    );
  }, [state.anime, searchValue, onlyInProgress, sortMode]);

  const emptyKind = !hasHistory
    ? "history"
    : searchValue.trim()
      ? "search"
      : "watching";
  const emptyTitle = t(
    emptyKind === "history"
      ? "watch.emptyHistoryTitle"
      : emptyKind === "search"
        ? "watch.emptySearchTitle"
        : "watch.emptyWatchingTitle",
  );
  const emptyDetail = t(
    emptyKind === "history"
      ? "watch.emptyHistoryDetail"
      : emptyKind === "search"
        ? "watch.emptySearchDetail"
        : "watch.emptyWatchingDetail",
  );

  return {
    t,
    items,
    hasHistory,
    setSearchValue,
    onlyInProgress,
    setOnlyInProgress,
    sortMode,
    setSortMode,
    emptyKind,
    emptyTitle,
    emptyDetail,
    onAdd: () => router.navigate({ pathname: "/anime-modal", params: {} }),
    onClear: () => onClearHistory(stateChanged),
    onEdit: (anime: Anime) =>
      router.navigate({
        pathname: "/anime-modal",
        params: { animeName: anime.name, episode: anime.highestWatchedEpisode },
      }),
    onToggleFinished: (anime: Anime) => {
      void AppStore.Dispatch(toggleAnimeFinished(anime.name)).then(
        stateChanged,
      );
    },
    onRemove: (anime: Anime) => onAnimeRemove(anime.name, stateChanged),
    onOpen: (anime: Anime) => {
      updateState(
        anime.latestVisitedUrl
          ? {
              url: anime.latestVisitedUrl,
              providerId: anime.providerId,
              reload: true,
            }
          : {},
      );
      router.navigate("/");
    },
  };
}
