import React from "react";
import type { WebViewProps } from "react-native-webview";
import runtime from "@/assets/js/provider-runtime_t.cjs";
import {
  parseRuntimeMessage,
  runtimeCommand,
  RuntimeSession,
} from "@/model/provider-runtime.model";
import type { AnimePayload, Provider } from "@/model";
import { animeUpdated } from "@/store/app.actions";
import {
  AccessoryContext,
  AppStateContext,
  AppStore,
  StoreContext,
} from "@/utils";
import {
  allowedUrl,
  matchesSeries,
  playbackPhase,
  providerEpisodeProgress,
  providerForUrl,
} from "@/utils/provider-runtime";
import { useProviderNavigation } from "@/hooks/use-provider-navigation";

export function useHomeBrowser() {
  const { webViewRef } = React.useContext(AccessoryContext);
  const { state, updateState } = React.useContext(AppStateContext);
  const { state: store, stateChanged } = React.useContext(StoreContext);
  const provider = state.url
    ? providerForUrl(store.providers, state.url, state.providerId)
    : undefined;
  const savedProgress = React.useMemo(
    () => (provider ? providerEpisodeProgress(store.anime) : {}),
    [store.anime, provider],
  );
  const setSheet = (browserSheet?: "providers" | "status") =>
    updateState((previous) => ({ ...previous, browserSheet }));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [status, setStatus] = React.useState(
    "Open an episode to start tracking.",
  );
  const session = React.useId();
  const pageSession = React.useRef(new RuntimeSession());
  const resumeSent = React.useRef(new Set<string>());
  const statusTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationRevision = React.useRef(0);
  const shouldNavigate = useProviderNavigation({
    provider,
    pageKey: () => (state.url ?? "") + ":" + navigationRevision.current,
    approve: async (item, origin) => {
      await AppStore.ApproveProviderOrigin(item.id, origin);
      await stateChanged();
    },
    navigate: (url) => {
      setNotice("");
      updateState((previous) => ({
        ...previous,
        url,
        providerId: provider?.id,
      }));
    },
    onError: setNotice,
  });
  React.useEffect(() => {
    if (pageSession.current.documentId) {
      webViewRef?.current?.injectJavaScript(
        runtimeCommand({
          type: "episodeProgress",
          progress: savedProgress,
          documentId: pageSession.current.documentId,
        }),
      );
    }
  }, [savedProgress, webViewRef]);
  React.useEffect(
    () => () => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
    },
    [],
  );
  React.useEffect(() => {
    if (!state.reload) return;
    webViewRef?.current?.reload();
    updateState((previous) => ({ ...previous, reload: false }));
  }, [state.reload, updateState, webViewRef]);
  function open(item: Provider) {
    pageSession.current.begin(item.origin);
    resumeSent.current.clear();
    setError("");
    setNotice("");
    setSheet();
    updateState({ url: item.origin, providerId: item.id });
  }
  function send(command: Record<string, unknown>) {
    if (pageSession.current.documentId)
      webViewRef?.current?.injectJavaScript(
        runtimeCommand({
          ...command,
          documentId: pageSession.current.documentId,
        }),
      );
  }
  function clearStatusTimer() {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = null;
  }
  const injection = provider
    ? "window.__providerSession=" +
      JSON.stringify(session) +
      ";if(window===window.top){window.__providerConfig=" +
      JSON.stringify(provider) +
      ";window.__runtimeMode=" +
      JSON.stringify(
        matchesSeries(provider, state.url ?? "") ? "watch" : "browse",
      ) +
      ";window.__providerProgress=" +
      JSON.stringify(savedProgress) +
      ";}" +
      runtime +
      ";true;"
    : "";

  const onLoadStart: NonNullable<WebViewProps["onLoadStart"]> = (event) => {
    navigationRevision.current++;
    pageSession.current.begin(event.nativeEvent.url);
    setLoading(true);
    setError("");
    setNotice("");
    pageSession.current.documentId = null;
    resumeSent.current.clear();
    setStatus("Tap the player placeholder or Play button to start tracking.");
    clearStatusTimer();
  };

  const onLoadEnd: NonNullable<WebViewProps["onLoadEnd"]> = () => {
    setLoading(false);
    webViewRef?.current?.injectJavaScript(
      runtimeCommand({ type: "reportReady" }),
    );
  };

  const onError: NonNullable<WebViewProps["onError"]> = () => {
    setLoading(false);
    setError(
      "Could not load the website. Check your connection and choose Reload.",
    );
  };

  const onHttpError: NonNullable<WebViewProps["onHttpError"]> = (event) => {
    if (event.nativeEvent.statusCode >= 400)
      setError(
        "Website returned error " +
          event.nativeEvent.statusCode +
          ". Choose Reload to retry.",
      );
  };

  const onNavigationStateChange: NonNullable<
    WebViewProps["onNavigationStateChange"]
  > = (event) => {
    if (!provider) return;
    if (!allowedUrl(provider, event.url)) return;
    pageSession.current.redirected(event.url);
    updateState((previous) => ({
      ...previous,
      url: event.url,
      providerId: provider.id,
      canGoBack: event.canGoBack,
      canGoForward: event.canGoForward,
    }));
    send({
      type: "configure",
      config: provider,
      mode: matchesSeries(provider, event.url) ? "watch" : "browse",
    });
  };

  const onMessage: NonNullable<WebViewProps["onMessage"]> = async (event) => {
    if (!provider) return;
    const message = parseRuntimeMessage(event.nativeEvent.data, session);
    if (
      !message ||
      !allowedUrl(provider, message.url) ||
      !pageSession.current.accept(message)
    )
      return;
    if (message.type === "ready") {
      send({
        type: "configure",
        config: provider,
        mode: matchesSeries(provider, message.url) ? "watch" : "browse",
      });
      send({ type: "episodeProgress", progress: savedProgress });
      return;
    }
    if (message.type === "players") {
      const player = provider.player
        ? message.players.find(
            (item) =>
              JSON.stringify(item.locator) === JSON.stringify(provider.player),
          )
        : message.players.length === 1
          ? message.players[0]
          : undefined;
      const phase = playbackPhase(player);
      if (
        !player &&
        message.inaccessibleFrames > 0 &&
        message.frameTrackingAvailable === false
      ) {
        clearStatusTimer();
        setStatus(
          "This embedded player cannot be tracked on this device. Update Android System WebView and retry.",
        );
        return;
      }
      if (phase === "waiting" || phase === "paused") {
        clearStatusTimer();
        setStatus(
          phase === "waiting"
            ? "Tap the player placeholder or Play button. Waiting for the primary video to appear."
            : "Player detected. Press Play to start tracking.",
        );
      } else if (phase === "verified") {
        clearStatusTimer();
      } else if (!statusTimer.current) {
        setStatus("Checking playback progress…");
        statusTimer.current = setTimeout(
          () =>
            setStatus(
              "If progress is not tracking, select the site’s primary player. If you already have, the site may not be supported. Edit this provider to retest.",
            ),
          20000,
        );
      }
      return;
    }
    if (
      message.documentId !== pageSession.current.documentId ||
      message.type !== "anime-found" ||
      !matchesSeries(provider, message.url)
    )
      return;
    const payload = message.payload;
    const progress = store.anime[payload.animeTitle];
    const resumeKey = payload.animeTitle + ":" + payload.episode;
    if (!resumeSent.current.has(resumeKey)) {
      resumeSent.current.add(resumeKey);
      const position = progress?.episodeProgress?.[payload.episode]?.progress;
      if (position && position > 0)
        send({
          type: "resume",
          resume: {
            title: payload.animeTitle,
            episode: payload.episode,
            progress: position,
          },
        });
    }
    if (
      payload.progress !== undefined &&
      (!Number.isFinite(payload.progress) ||
        payload.progress < 0 ||
        !Number.isFinite(payload.total) ||
        !(payload.total! > 0))
    )
      return;
    try {
      // Wait for resume to be offered before overwriting an existing saved position.
      if (
        payload.progress !== undefined &&
        progress?.episodeProgress?.[payload.episode]?.progress &&
        !resumeSent.current.has(resumeKey + ":started")
      ) {
        resumeSent.current.add(resumeKey + ":started");
        return;
      }
      await AppStore.Dispatch(
        animeUpdated(message.url, {
          ...payload,
          providerId: provider.id,
        } as AnimePayload),
      );
      stateChanged();
      setStatus(
        payload.progress !== undefined
          ? payload.animeTitle +
              " · Episode " +
              payload.episode +
              " · " +
              Math.floor(payload.progress) +
              " / " +
              Math.floor(payload.total!) +
              " seconds"
          : payload.animeTitle + " · Episode " + payload.episode + " selected",
      );
    } catch {
      setError(
        "Could not save playback progress. Your previous history is preserved; choose Reload to retry.",
      );
    }
  };

  function dismissNotice() {
    setError("");
    setNotice("");
  }

  return {
    provider,
    providers: store.providers,
    url: state.url,
    browserSheet: state.browserSheet,
    webViewRef,
    injection,
    loading,
    error,
    notice,
    status,
    open,
    setSheet,
    dismissNotice,
    onLoadStart,
    onLoadEnd,
    onError,
    onHttpError,
    onNavigationStateChange,
    onMessage,
    shouldNavigate,
  };
}
