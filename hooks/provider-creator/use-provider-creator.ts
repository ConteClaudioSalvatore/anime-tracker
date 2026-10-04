import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Provider } from "@/model/provider.model";
import {
  allowedUrl,
  learnPageRule,
  normalizeWebsite,
  playbackPhase,
  providerSaveError,
} from "@/utils/provider-runtime";
import { ProviderPageChecks } from "@/utils/provider-page-checks";
import { useProviderPalette } from "@/hooks/use-provider-palette";
import { fields } from "@/components/provider-creator/creator-config";
import { useCreatorPersistence } from "./use-creator-persistence";
import { useCreatorState } from "./use-creator-state";
import { useCreatorBrowser } from "./use-creator-browser";

export function useProviderCreator() {
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
        if (!draft.name?.trim()) throw new Error("Enter a provider name.");
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
          error:
            cause instanceof Error
              ? cause.message
              : "Check the website address.",
        });
      }
      return;
    }
    if (step === 1) {
      try {
        if (pages.some((value) => !allowedUrl(draft, value)))
          throw new Error("Choose pages on the website or an approved alias.");
        const rule = learnPageRule(pages, pages[0]);
        edit({
          ...draft,
          pageRule: rule,
          seriesPageOrigin: rule.origin + rule.pathPrefix,
          examplePages: pages,
        });
        go(2);
      } catch (cause) {
        updateWizard({ error: (cause as Error).message });
      }
      return;
    }
    if (field) {
      if (!candidate?.valid) return;
      edit({ ...draft, [field]: candidate.selector });
    }
    if (step === 5) {
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
      updateWizard({ error: "Choose a page on this website." });
      return;
    }
    const captured = new URL(url);
    captured.hash = "";
    if (pages.includes(captured.href)) {
      updateWizard({
        error: "This page is already selected. Open a different series.",
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
        : field
          ? !!candidate?.valid && ready
          : step === 5
            ? (ready && !!selectedPlayer?.progress) || saveAnyway
            : true);
  const hint =
    step === 0
      ? "Enter a name and website address."
      : step === 1
        ? "Choose two different series pages."
        : field
          ? (candidate?.error ??
            "Select the requested information on the website.")
          : step === 5
            ? "Play the episode to verify progress. Checking automatic resume is optional."
            : "Review the example pages before saving.";
  const saveError =
    step === 6 ? providerSaveError(draft, pages, checks, saveAnyway) : null;
  const selectionLabel =
    step === 2 ? "title" : step === 3 ? "episodes" : "total";
  const primaryAction =
    step === 6
      ? {
          label: saving
            ? "Saving…"
            : reviewPage
              ? "Checking…"
              : "Save provider",
          onPress: () => void save(),
          disabled: saved || !!reviewPage || saving,
        }
      : step === 1 && pages.length < 2
        ? {
            label: "Use this page",
            onPress: capturePage,
            disabled: !ready || saving,
          }
        : field && !candidate?.valid
          ? {
              label: select
                ? "Tap the " + selectionLabel
                : "Select " + selectionLabel,
              onPress: startSelection,
              disabled: select || !ready || saving,
            }
          : step === 5 && !canContinue
            ? {
                label: "Play the episode",
                onPress: next,
                disabled: true,
              }
            : { label: "Continue", onPress: next, disabled: !canContinue };
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
    saveError,
    primaryAction,
    colors,
    id,
    router,
  };
}
export type ProviderCreator = ReturnType<typeof useProviderCreator>;
