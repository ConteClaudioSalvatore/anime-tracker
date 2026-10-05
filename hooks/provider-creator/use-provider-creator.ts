import { useAppTranslation } from "@/hooks/use-app-translation";
import { selectionFeedback } from "@/utils/runtime-feedback";
import {
  TranslationError,
  message,
  formatMessage,
  errorMessage,
} from "@/utils/i18n";
import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Provider } from "@/model/provider.model";
import {
  allowedUrl,
  learnPageRule,
  normalizeWebsite,
  playbackPhase,
  providerSaveMessage,
} from "@/utils/provider-runtime";
import { ProviderPageChecks } from "@/utils/provider-page-checks";
import { useProviderPalette } from "@/hooks/use-provider-palette";
import { fields } from "@/components/provider-creator/creator-config";
import { useCreatorPersistence } from "./use-creator-persistence";
import { useCreatorState } from "./use-creator-state";
import { useCreatorBrowser } from "./use-creator-browser";

export function useProviderCreator() {
  const t = useAppTranslation();
  const { id } = useLocalSearchParams<{
    id?: string;
  }>();
  const router = useRouter();
  const colors = useProviderPalette();
  const { state, actions } = useCreatorState();
  const {
    draft,
    initialized,
    aliasInput,
    pages,
    checks,
    saveAnyway,
    saving,
    saved,
  } = state.setup;
  const { step } = state.wizard;
  const { url, ready } = state.browser;
  const { select, candidate } = state.selection;
  const { players, playerKey } = state.playback;
  const { reviewPage } = state;
  const { updateSetup, updateWizard, updateBrowser, dispatch } = actions;
  const latestDraftRef = React.useRef(draft);
  React.useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);
  const pageChecks = React.useRef(new ProviderPageChecks());
  const field = fields[step];
  const optionalField = field === "coverImageSelector";
  const selectedPlayer = players.find(
    (player) => JSON.stringify(player.locator) === playerKey,
  );
  const videoPhase = playbackPhase(selectedPlayer);
  const edit = (next: Provider<false>) => {
    pageChecks.current.cancel();
    dispatch({ type: "edit", draft: next });
  };
  const browser = useCreatorBrowser({
    state,
    actions,
    latestDraftRef,
    pageChecks,
    edit,
  });
  const { resetResumeTest, startSelection } = browser;
  const save = useCreatorPersistence({ state, actions, id, router });
  function changeWebsite(origin: string) {
    pageChecks.current.cancel();
    dispatch({ type: "changeWebsite", origin });
  }
  function go(next: number) {
    resetResumeTest();
    pageChecks.current.cancel();
    dispatch({ type: "go", step: next });
  }
  function next() {
    updateWizard({ error: "" });
    if (step === 0) {
      try {
        if (!draft.name?.trim())
          throw new TranslationError(message("validation.name"));
        const origin = normalizeWebsite(draft.origin ?? "");
        const aliases = aliasInput
          .split(/[,\n]/)
          .map((value) => value.trim())
          .filter(Boolean)
          .map((value) => new URL(normalizeWebsite(value)).origin);
        const whiteListedOrigins = [
          ...new Set([...draft.whiteListedOrigins, ...aliases]),
        ];
        if (origin !== draft.origin || aliases.length)
          edit({ ...draft, origin, whiteListedOrigins });
        updateBrowser({ source: origin, url: origin });
        go(1);
      } catch (cause) {
        updateWizard({
          error: errorMessage(cause, "validation.checkAddress"),
        });
      }
      return;
    }
    if (step === 1) {
      try {
        if (pages.some((value) => !allowedUrl(draft, value)))
          throw new TranslationError(message("validation.pageOrAlias"));
        const rule = learnPageRule(pages, pages[0]);
        edit({
          ...draft,
          pageRule: rule,
          seriesPageOrigin: rule.origin + rule.pathPrefix,
          examplePages: pages,
        });
        go(2);
      } catch (cause) {
        updateWizard({
          error: errorMessage(cause, "validation.differentPages"),
        });
      }
      return;
    }
    if (field) {
      if (!optionalField && !candidate?.valid) return;
      if (candidate?.valid && ready)
        edit({ ...draft, [field]: candidate.selector });
    }
    if (step === 6) {
      const currentPlayer = ready ? selectedPlayer : undefined;
      if (!currentPlayer?.progress && !saveAnyway) return;
      const acknowledged = saveAnyway;
      edit({
        ...draft,
        isPlayerSupported: !!currentPlayer?.progress,
        player: currentPlayer?.locator,
        verification: {
          progress: !!currentPlayer?.progress,
          resume: !!currentPlayer?.resume,
          checkedAt: new Date().toISOString(),
        },
      });
      updateSetup({ saveAnyway: acknowledged });
    }
    go(step + 1);
  }
  function capturePage() {
    if (!ready || saving || pages.length >= 2) return;
    if (!allowedUrl(draft, url)) {
      updateWizard({ error: message("validation.pageOnWebsite") });
      return;
    }
    const captured = new URL(url);
    captured.hash = "";
    if (pages.includes(captured.href)) {
      updateWizard({
        error: message("validation.duplicatePage"),
      });
      return;
    }
    dispatch({ type: "capturePage", page: captured.href });
  }
  const canContinue =
    initialized &&
    !saving &&
    (step === 0
      ? !!draft.name?.trim() && !!draft.origin?.trim()
      : step === 1
        ? pages.length >= 2
        : optionalField
          ? true
          : field
            ? !!candidate?.valid && ready
            : step === 6
              ? (ready && !!selectedPlayer?.progress) || saveAnyway
              : true);
  const hint =
    step === 0
      ? t("creator.websiteHint")
      : step === 1
        ? t("validation.differentPages")
        : field
          ? candidate?.error
            ? selectionFeedback(candidate, t)
            : t("creator.selectHint")
          : step === 6
            ? t("creator.playbackHint")
            : t("creator.reviewHint");
  const saveError =
    step === 7 ? providerSaveMessage(draft, pages, checks, saveAnyway) : null;
  const selectionLabels = {
    2: ["creator.tapTitle", "creator.selectTitle"],
    3: ["creator.tapEpisodes", "creator.selectEpisodes"],
    4: ["creator.tapTotal", "creator.selectTotal"],
    5: ["creator.tapCover", "creator.selectCover"],
  } as const;
  const selectionLabel = selectionLabels[step as 2 | 3 | 4 | 5];
  const primaryAction =
    step === 7
      ? {
          label: saving
            ? t("common.saving")
            : reviewPage
              ? t("common.checking")
              : t("provider.save"),
          onPress: () => void save(),
          disabled: saved || !!reviewPage || saving,
        }
      : step === 1 && pages.length < 2
        ? {
            label: t("creator.usePage"),
            onPress: capturePage,
            disabled: !ready || saving,
          }
        : field && !optionalField && !candidate?.valid
          ? {
              label: t(selectionLabel[select ? 0 : 1]),
              onPress: startSelection,
              disabled: select || !ready || saving,
            }
          : step === 6 && !canContinue
            ? {
                label: t("creator.playEpisode"),
                onPress: next,
                disabled: true,
              }
            : {
                label: t("common.continue"),
                onPress: next,
                disabled: !canContinue,
              };
  return {
    state,
    actions,
    browser,
    field,
    selectedPlayer,
    videoPhase,
    edit,
    changeWebsite,
    go,
    canContinue,
    hint,
    saveError: saveError ? formatMessage(saveError, t) : null,
    skipCover: () => {
      edit({ ...draft, coverImageSelector: undefined });
      go(6);
    },
    primaryAction,
    colors,
    id,
    router,
  };
}
export type ProviderCreator = ReturnType<typeof useProviderCreator>;
