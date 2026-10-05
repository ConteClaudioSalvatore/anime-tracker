import { useAppTranslation } from "@/hooks/use-app-translation";
import { upsertAnime } from "@/store/app.actions";
import { AppStore, StoreContext } from "@/utils";
import { parseAnimeEpisode, parseAnimeTotal } from "@/utils/anime-editor";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useContext, useRef, useState } from "react";
import { Keyboard } from "react-native";

export function useAnimeEditor() {
  const t = useAppTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    animeName?: string;
    episode?: string;
  }>();
  const { state, stateChanged } = useContext(StoreContext);
  const savedTotal = state.anime[params.animeName ?? ""]?.total;
  const [fields, setFields] = useState({
    name: params.animeName ?? "",
    episode: params.episode ?? "1",
    total:
      Number.isSafeInteger(savedTotal) && savedTotal! > 0
        ? String(savedTotal)
        : "?",
  });
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const saveInFlight = useRef(false);
  const editing = !!params.animeName;
  const episode = parseAnimeEpisode(fields.episode);
  const total = parseAnimeTotal(fields.total);
  const canSave =
    fields.name.trim().length > 0 &&
    episode !== undefined &&
    total !== undefined &&
    !saving;

  function change(field: keyof typeof fields, value: string) {
    setFields((previous) => ({ ...previous, [field]: value }));
    setSaveFailed(false);
  }

  async function save() {
    if (!canSave || saveInFlight.current) return;
    saveInFlight.current = true;
    setSaving(true);
    setSaveFailed(false);
    Keyboard.dismiss();
    try {
      await AppStore.Dispatch(upsertAnime(fields.name, episode!, total));
      await stateChanged();
      router.back();
    } catch {
      setSaveFailed(true);
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  return {
    t,
    fields,
    saving,
    editing,
    canSave,
    error: saveFailed ? t("anime.saveFailed") : "",
    episodeError:
      fields.episode.trim() && episode === undefined
        ? t("anime.episodeInvalid")
        : "",
    totalError:
      fields.total.trim() && total === undefined ? t("anime.totalInvalid") : "",
    title: editing ? t("anime.editTitle") : t("anime.addTitle"),
    saveLabel: saving
      ? t("common.saving")
      : editing
        ? t("anime.saveChanges")
        : t("anime.addToList"),
    change,
    save,
    close: () => {
      if (!saveInFlight.current) router.back();
    },
  };
}

export type AnimeEditor = ReturnType<typeof useAnimeEditor>;
