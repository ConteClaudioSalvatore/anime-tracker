import {
  translate as t,
  message,
  TranslationError,
  formatMessage,
  errorMessage,
} from "@/utils/i18n";
import React from "react";
import { Alert } from "react-native";
import { useNavigation, type useRouter } from "expo-router";
import { AppStore, StoreContext } from "@/utils";
import { AppStateContext } from "@/utils/app-state.util";
import type { Provider, SaveProviderResult } from "@/model/provider.model";
import { providerSaveMessage } from "@/utils/provider-runtime";
import type { CreatorState } from "./use-creator-state";

type PersistenceOptions = CreatorState & {
  id?: string;
  router: ReturnType<typeof useRouter>;
};
export function useCreatorPersistence({
  state,
  actions,
  id,
  router,
}: PersistenceOptions) {
  const navigation = useNavigation();
  const { stateChanged } = React.useContext(StoreContext);
  const { updateState } = React.useContext(AppStateContext);
  const { draft, pages, checks, saveAnyway, dirty, saved } = state.setup;
  const { updateSetup, updateWizard, updateBrowser, updatePlayback } = actions;
  const saveLock = React.useRef(false);
  const allowExit = React.useRef(false);
  React.useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (allowExit.current || saved || !dirty) return;
        event.preventDefault();
        if (saveLock.current) return;
        Alert.alert(t("provider.discardTitle"), t("provider.discardHelp"), [
          { text: t("provider.keepEditing"), style: "cancel" },
          {
            text: t("provider.discard"),
            style: "destructive",
            onPress: () => {
              allowExit.current = true;
              navigation.dispatch(event.data.action);
            },
          },
        ]);
      }),
    [navigation, dirty, saved],
  );
  React.useEffect(() => {
    let active = true;
    AppStore.Get()
      .then((state) => {
        if (!active) return;
        const existing = id
          ? state.providers.find((provider) => provider.id === Number(id))
          : undefined;
        if (id && !existing) {
          updateWizard({
            error: message("provider.missing"),
          });
          updateSetup({ initialized: true });
          return;
        }
        if (existing) {
          updateSetup({
            draft: { ...existing },
            pages: existing.examplePages ?? [],
          });
          updateBrowser({ source: existing.origin, url: existing.origin });
          if (existing.player)
            updatePlayback({ playerKey: JSON.stringify(existing.player) });
        }
        updateSetup({ initialized: true });
      })
      .catch(() => {
        if (active) {
          updateWizard({
            error: message("provider.loadFailed"),
          });
          updateSetup({ initialized: true });
        }
      });
    return () => {
      active = false;
    };
  }, [id, updateBrowser, updatePlayback, updateSetup, updateWizard]);
  async function saveProvider(): Promise<SaveProviderResult> {
    const invalid = providerSaveMessage(draft, pages, checks, saveAnyway);
    if (invalid) return { success: false, message: invalid };
    try {
      const provider = {
        ...draft,
        name: draft.name!.trim(),
        configurationVersion: 2,
        examplePages: pages,
      } as Provider;
      if (
        id &&
        !(await AppStore.Get()).providers.some((item) => item.id === Number(id))
      )
        throw new TranslationError(message("provider.deleted"));
      const stored = await AppStore.SaveProvider(provider);
      stateChanged();
      return { success: true, provider: stored };
    } catch (cause) {
      return {
        success: false,
        message: errorMessage(cause, "provider.saveFailed"),
      };
    }
  }
  async function save() {
    if (saveLock.current) return;
    saveLock.current = true;
    updateSetup({ saving: true });
    updateWizard({ error: "" });
    const result = await saveProvider();
    saveLock.current = false;
    updateSetup({ saving: false });
    if (!result.success) {
      updateWizard({ error: result.message });
      Alert.alert(t("provider.notSaved"), formatMessage(result.message));
      return;
    }
    allowExit.current = true;
    updateSetup({ saved: true, dirty: false });
    Alert.alert(t("provider.saved"), t("provider.savedHelp"), [
      { text: t("common.done"), onPress: () => router.back() },
      {
        text: t("provider.openWebsite"),
        onPress: () => {
          updateState({
            url: result.provider.origin,
            providerId: result.provider.id,
          });
          router.dismissTo("/");
        },
      },
    ]);
  }
  return save;
}
