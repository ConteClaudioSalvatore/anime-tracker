import { message } from "@/utils/i18n";
import React from "react";
import WebView, { type WebViewProps } from "react-native-webview";
import type { Provider } from "@/model/provider.model";
import {
  parseRuntimeMessage,
  runtimeCommand,
  RuntimeSession,
  type PlayerSample,
} from "@/model/provider-runtime.model";
import {
  allowedUrl,
  approveProviderOrigin,
  playbackPhase,
} from "@/utils/provider-runtime";
import { ProviderPageChecks } from "@/utils/provider-page-checks";
import { useProviderNavigation } from "@/hooks/use-provider-navigation";
import { fields } from "@/components/provider-creator/creator-config";
import { useExamplePageChecks } from "./use-example-page-checks";
import type { CreatorState } from "./use-creator-state";

type BrowserOptions = CreatorState & {
  latestDraftRef: React.RefObject<Provider<false>>;
  pageChecks: React.RefObject<ProviderPageChecks>;
  edit: (draft: Provider<false>) => void;
};

export function useCreatorBrowser({
  state,
  actions,
  latestDraftRef,
  pageChecks,
  edit,
}: BrowserOptions) {
  const { draft, saving } = state.setup;
  const { step } = state.wizard;
  const { source, url, ready } = state.browser;
  const { select } = state.selection;
  const { players, playerKey, testRun } = state.playback;

  const {
    updateWizard,
    updateBrowser,
    updateSelection,
    updatePlayback,
    setReviewPage,
    dispatch,
  } = actions;
  const webView = React.useRef<WebView>(null);
  const session = React.useId();
  const pageSession = React.useRef(new RuntimeSession());
  const navigationRevision = React.useRef(0);
  const request = React.useRef("");
  const resumeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const field = fields[step];
  const selectedPlayer = players.find(
    (player) => JSON.stringify(player.locator) === playerKey,
  );
  const videoPhase = playbackPhase(selectedPlayer);
  const send = React.useCallback((command: Record<string, unknown>) => {
    if (pageSession.current.documentId)
      webView.current?.injectJavaScript(
        runtimeCommand({
          ...command,
          documentId: pageSession.current.documentId,
        }),
      );
  }, []);
  const resetResumeTest = React.useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = null;
    updatePlayback({ resumeTest: "idle" });
  }, [updatePlayback]);
  React.useEffect(
    () => () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    },
    [],
  );
  function checkResume() {
    if (
      !ready ||
      !selectedPlayer?.progress ||
      selectedPlayer.seekable === false ||
      saving ||
      resumeTimer.current
    )
      return;
    resetResumeTest();
    updatePlayback({ resumeTest: "testing" });
    send({ type: "testSeek", locator: selectedPlayer.locator });
    resumeTimer.current = setTimeout(() => {
      resumeTimer.current = null;
      updatePlayback({ resumeTest: "failed" });
    }, 7000);
  }
  const openPage = React.useCallback(
    (value: string) => {
      resetResumeTest();
      pageChecks.current.cancel();
      setReviewPage(null);
      updateBrowser({ source: value, url: value, ready: false });
      updateSelection({ select: false, candidate: null });
      pageSession.current.begin(value);
      if (value === source)
        webView.current?.injectJavaScript(
          `window.location.assign(${JSON.stringify(value)}); true;`,
        );
    },
    [
      resetResumeTest,
      pageChecks,
      setReviewPage,
      updateBrowser,
      updateSelection,
      source,
    ],
  );
  const shouldNavigate = useProviderNavigation({
    provider: draft,
    pageKey: () => url + ":" + navigationRevision.current,
    approve: async (_provider, origin) => {
      const next = approveProviderOrigin(latestDraftRef.current, origin);
      latestDraftRef.current = next;
      edit(next);
    },
    navigate: (value) => {
      updateWizard({ error: "" });
      openPage(value);
    },
    onError: (error) => updateWizard({ error }),
  });
  const { completeCheck, testExample } = useExamplePageChecks({
    state,
    actions,
    latestDraftRef,
    pageChecks,
    pageSessionRef: pageSession,
    send,
    openPage,
  });
  React.useEffect(() => {
    if (ready) send({ type: "configure", config: draft });
  }, [draft, ready, send]);
  React.useEffect(() => {
    if (!ready) return;
    const token = Math.random().toString(36).slice(2);
    request.current = token;
    send({
      type: "selectMode",
      enabled: select && !!field,
      field,
      requestId: token,
    });
    const selector = field && latestDraftRef.current[field];
    if (selector) {
      send({ type: "evaluate", selector, field, requestId: token });
    }
  }, [step, field, ready, select, send, latestDraftRef]);
  React.useEffect(() => {
    if (step !== 6 || !ready || videoPhase !== "checking") return;
    const timer = setTimeout(() => updatePlayback({ timedOut: true }), 20000);
    return () => clearTimeout(timer);
  }, [step, ready, testRun, videoPhase, playerKey, updatePlayback]);
  function startSelection() {
    updateSelection({ candidate: null, select: true });
    send({
      type: "selectMode",
      enabled: true,
      field,
      requestId: request.current,
    });
  }

  function testSelector() {
    const token = Math.random().toString(36).slice(2);
    request.current = token;
    updateSelection({ candidate: null });
    send({
      type: "evaluate",
      field,
      selector: state.selection.manualSelector,
      requestId: token,
    });
  }
  function choosePlayer(player: PlayerSample) {
    resetResumeTest();
    send({ type: "choosePlayer", locator: player.locator });
    dispatch({ type: "choosePlayer", key: JSON.stringify(player.locator) });
  }
  function retryPlayback() {
    resetResumeTest();
    send({ type: "resetPlayerTest" });
    dispatch({ type: "retryPlayback" });
  }
  const onLoadStart: NonNullable<WebViewProps["onLoadStart"]> = (event) => {
    resetResumeTest();
    navigationRevision.current++;
    pageSession.current.begin(event.nativeEvent.url);
    dispatch({ type: "pageLoading" });
    pageSession.current.documentId = null;
    request.current = "";
  };
  const onLoadEnd: NonNullable<WebViewProps["onLoadEnd"]> = () => {
    updateBrowser({ loading: false });
    webView.current?.injectJavaScript(runtimeCommand({ type: "reportReady" }));
  };
  const onError: NonNullable<WebViewProps["onError"]> = () => {
    updateBrowser({ loading: false });
    updateWizard({
      error: message("browser.loadFailed"),
    });
  };
  const onHttpError: NonNullable<WebViewProps["onHttpError"]> = (event) => {
    if (event.nativeEvent.statusCode >= 400)
      updateWizard({
        error: message("browser.httpError", {
          code: event.nativeEvent.statusCode,
        }),
      });
  };
  const onNavigationStateChange: NonNullable<
    WebViewProps["onNavigationStateChange"]
  > = (state) => {
    if (!allowedUrl(latestDraftRef.current, state.url)) return;
    pageSession.current.redirected(state.url);
    updateBrowser({ url: state.url });
    updateBrowser({
      navigationState: {
        back: state.canGoBack,
        forward: state.canGoForward,
      },
    });
  };
  const onMessage: NonNullable<WebViewProps["onMessage"]> = (event) => {
    const message = parseRuntimeMessage(event.nativeEvent.data, session);
    if (
      !message ||
      !allowedUrl(latestDraftRef.current, message.url) ||
      !pageSession.current.accept(message)
    )
      return;
    if (message.type === "ready") {
      updateBrowser({ ready: true, url: message.url });
      webView.current?.injectJavaScript(
        runtimeCommand({
          type: "configure",
          config: latestDraftRef.current,
          documentId: message.documentId,
        }),
      );
      return;
    }
    if (message.documentId !== pageSession.current.documentId) return;
    if (
      message.type === "selection" &&
      message.requestId === request.current &&
      message.field === field
    ) {
      dispatch({ type: "selectionReceived", field, preview: message.preview });
    }
    if (message.type === "players") {
      updatePlayback({
        players: message.players,
        inaccessible: message.inaccessibleFrames,
        frameTrackingAvailable: message.frameTrackingAvailable,
      });
      const chosen = message.players.find(
        (player) => JSON.stringify(player.locator) === playerKey,
      );
      if (chosen?.resume && resumeTimer.current) resetResumeTest();
      if (playbackPhase(chosen) !== "checking")
        updatePlayback({ timedOut: false });
      if (!playerKey && message.players.length === 1)
        updatePlayback({
          playerKey: JSON.stringify(message.players[0].locator),
        });
    }
    if (message.type === "extraction")
      completeCheck(pageChecks.current.accept(message));
  };

  return {
    webView,
    session,
    send,
    resetResumeTest,
    openPage,
    testExample,
    checkResume,
    startSelection,
    testSelector,
    choosePlayer,
    retryPlayback,
    onLoadStart,
    onLoadEnd,
    onError,
    onHttpError,
    onNavigationStateChange,
    onMessage,
    shouldNavigate,
  };
}
