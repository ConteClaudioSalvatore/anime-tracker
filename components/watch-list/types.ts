import type { Anime } from "@/model";
import type { WatchListSortMode } from "@/utils/watch-list";

export interface WatchListHeaderProps {
  hasHistory: boolean;
  onClear: () => void;
  onAdd: () => void;
  onExport: () => void;
  exporting: boolean;
  onlyInProgress: boolean;
  setOnlyInProgress: (value: boolean) => void;
  sortMode: WatchListSortMode;
  setSortMode: (value: WatchListSortMode) => void;
}

export interface WatchListRowProps {
  name: string;
  anime: Anime;
  onOpen: () => void;
  onEdit: () => void;
  onToggleFinished: () => void;
  onRemove: () => void;
}
