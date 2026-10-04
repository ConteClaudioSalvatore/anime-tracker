import React from "react";
import type { Provider } from "@/model/provider.model";
import type { RuntimeSession } from "@/model/provider-runtime.model";
import type {
  ProviderPageChecks,
  PageCheckResult,
} from "@/utils/provider-page-checks";
import type { CreatorState } from "./use-creator-state";

type Options = CreatorState & {
  latestDraftRef: React.RefObject<Provider<false>>;
  pageChecks: React.RefObject<ProviderPageChecks>;
  pageSessionRef: React.RefObject<RuntimeSession>;
  send: (command: Record<string, unknown>) => void;
  openPage: (page: string) => void;
};
export function useExamplePageChecks({
  state,
  actions,
  latestDraftRef,
  pageChecks,
  pageSessionRef,
  send,
  openPage,
}: Options) {
  const { pages, checks } = state.setup;
  const { step } = state.wizard;
  const { url, ready } = state.browser;
  const { reviewPage } = state;
  const { updateSetup, setReviewPage } = actions;
  const completeCheck = React.useCallback(
    (result: PageCheckResult | null) => {
      if (!result) return;
      updateSetup((previous) => ({
        checks: { ...previous.checks, [result.page]: result.preview },
      }));
      setReviewPage(null);
    },
    [setReviewPage, updateSetup],
  );
  const testExample = React.useCallback(
    (page: string) => {
      if (url !== page || !ready) openPage(page);
      pageChecks.current.start(page);
      setReviewPage(page);
    },
    [url, ready, openPage, pageChecks, setReviewPage],
  );
  React.useEffect(() => {
    if (step !== 6 || reviewPage) return;
    const unchecked = pages.find((page) => !checks[page]);
    if (!unchecked) return;
    const start = setTimeout(() => testExample(unchecked), 0);
    return () => clearTimeout(start);
  }, [step, reviewPage, pages, checks, testExample]);
  React.useEffect(() => {
    if (step !== 6 || !ready || !reviewPage) return;
    const run = () => {
      const documentId = pageSessionRef.current.documentId;
      if (!documentId) return;
      send({ type: "configure", config: latestDraftRef.current });
      const command = pageChecks.current.command(documentId, reviewPage);
      if (command) send(command);
    };
    run();
    const retry = setInterval(run, 500);
    return () => clearInterval(retry);
  }, [
    step,
    ready,
    reviewPage,
    send,
    pageSessionRef,
    latestDraftRef,
    pageChecks,
  ]);
  React.useEffect(() => {
    if (!reviewPage) return;
    const timeout = setTimeout(
      () => completeCheck(pageChecks.current.finish()),
      15000,
    );
    return () => clearTimeout(timeout);
  }, [reviewPage, completeCheck, pageChecks]);
  return { completeCheck, testExample };
}
