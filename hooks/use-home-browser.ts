import { useMessageFormatter } from "@/hooks/use-app-translation";
import { message as feedback, type AppMessage } from "@/utils/i18n";
import React from "react";
import type { WebViewProps } from "react-native-webview";
import runtime from "@/assets/js/provider-runtime_t.cjs";
import {
  parseRuntimeMessage,
  runtimeCommand,
  RuntimeSession,
} from "@/model/provider-runtime.model";
import type { AnimePayload, Provider } from "@/model";
import { animeUpdated, animeCoverUpdated } from "@/store/app.actions";
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
  const format = useMessageFormatter();
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
  const loading = state.browserLoading ?? false;
  const setLoading = React.useCallback(
    (browserLoading: boolean) =>
      updateState((previous) =>
        previous.browserLoading === browserLoading
          ? previous
          : { ...previous, browserLoading },
      ),
    [updateState],
  );
  React.useEffect(() => {
    setLoading(false);
    return () => setLoading(false);
  }, [provider?.id, setLoading]);
  const [error, setError] = React.useState<AppMessage>("");
  const [notice, setNotice] = React.useState<AppMessage>("");
  const [status, setStatus] = React.useState<AppMessage>(
    feedback("home.openEpisode"),
  );
  const session = React.useId();
  const pageSession = React.useRef(new RuntimeSession());
  const resumeSent = React.useRef(new Set<string>());
  const statusTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationRevision = React.useRef(0);
  const loadedPage = React.useRef<{ url: string; providerId?: number } | null>(
    null,
  );
  const pendingOpen = React.useRef<{
    url: string;
    providerId: number;
    previousUrl?: string;
  } | null>(null);
  function staleNavigation(url: string): boolean {
    const pending = pendingOpen.current;
    return (
      !!pending &&
      (provider?.id !== pending.providerId ||
        (url !== pending.url && url === pending.previousUrl))
    );
  }
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
    pendingOpen.current = null;
    if (provider && state.url) {
      const current = loadedPage.current;
      pendingOpen.current = {
        url: state.url,
        providerId: provider.id,
        previousUrl: current?.url,
      };
      pageSession.current.begin(state.url);
      resumeSent.current.clear();
      // A changed source navigates itself. Reloading here can reload the old native URL.
      if (current?.url === state.url && current.providerId === provider.id)
        webViewRef?.current?.reload();
    }
    updateState((previous) => ({ ...previous, reload: false }));
  }, [state.reload, state.url, provider, updateState, webViewRef]);
  function open(item: Provider) {
    pendingOpen.current = null;
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
  function reportReady() {
    webViewRef?.current?.injectJavaScript(
      runtimeCommand({
        type: "reportReady",
        navigationRevision: navigationRevision.current,
      }),
    );
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
    if (staleNavigation(event.nativeEvent.url)) return;
    pendingOpen.current = null;
    loadedPage.current = {
      url: event.nativeEvent.url,
      providerId: provider?.id,
    };
    navigationRevision.current++;
    pageSession.current.begin(event.nativeEvent.url);
    setLoading(true);
    setError("");
    setNotice("");
    pageSession.current.documentId = null;
    resumeSent.current.clear();
    setStatus(feedback("home.activatePlayer"));
    clearStatusTimer();
  };

  const onLoadEnd: NonNullable<WebViewProps["onLoadEnd"]> = (event) => {
    if (
      staleNavigation(event.nativeEvent.url) ||
      event.nativeEvent.url !== loadedPage.current?.url ||
      !provider ||
      !allowedUrl(provider, event.nativeEvent.url)
    )
      return;
    setLoading(false);
    reportReady();
  };

  const onError: NonNullable<WebViewProps["onError"]> = () => {
    setLoading(false);
    setError(feedback("browser.loadFailed"));
  };

  const onHttpError: NonNullable<WebViewProps["onHttpError"]> = (event) => {
    if (event.nativeEvent.statusCode >= 400)
      setError(
        feedback("browser.httpError", { code: event.nativeEvent.statusCode }),
      );
  };

  const onNavigationStateChange: NonNullable<
    WebViewProps["onNavigationStateChange"]
  > = (event) => {
    if (!provider) return;
    if (!allowedUrl(provider, event.url) || staleNavigation(event.url)) return;
    setLoading(event.loading);
    loadedPage.current = { url: event.url, providerId: provider.id };
    pageSession.current.redirected(event.url);
    updateState((previous) =>
      previous.reload && previous.url !== event.url
        ? previous
        : {
            ...previous,
            url: event.url,
            providerId: provider.id,
            canGoBack: event.canGoBack,
            canGoForward: event.canGoForward,
          },
    );
    send({
      type: "configure",
      config: provider,
      mode: matchesSeries(provider, event.url) ? "watch" : "browse",
    });
    // Android history updates can retire the bridge without replacing the DOM.
    // Renew its identity once native navigation has settled, including redirects.
    if (!event.loading) {
      reportReady();
    }
  };

  const onMessage: NonNullable<WebViewProps["onMessage"]> = async (event) => {
    if (!provider) return;
    const message = parseRuntimeMessage(event.nativeEvent.data, session);
    if (
      !message ||
      (message.type === "ready" &&
        message.navigationRevision !== navigationRevision.current) ||
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
    if (message.type === "anime-cover") {
      const { animeTitle, coverUrl } = message.payload;
      if (
        !matchesSeries(provider, message.url) ||
        !store.anime[animeTitle] ||
        store.anime[animeTitle].coverUrl === coverUrl
      )
        return;
      try {
        await AppStore.Dispatch(animeCoverUpdated(animeTitle, coverUrl));
        await stateChanged();
      } catch {
        setError(feedback("home.saveCoverFailed"));
      }
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
        setStatus(feedback("home.inaccessiblePlayer"));
        return;
      }
      if (phase === "waiting" || phase === "paused") {
        clearStatusTimer();
        setStatus(
          phase === "waiting"
            ? feedback("home.waitingPlayer")
            : feedback("home.pressPlay"),
        );
      } else if (phase === "verified") {
        clearStatusTimer();
      } else if (!statusTimer.current) {
        setStatus(feedback("home.checkingPlayback"));
        statusTimer.current = setTimeout(
          () => setStatus(feedback("home.trackingHelp")),
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
          ? feedback("home.progress", {
              title: payload.animeTitle,
              episode: payload.episode,
              time: Math.floor(payload.progress),
              total: Math.floor(payload.total!),
            })
          : feedback("home.selected", {
              title: payload.animeTitle,
              episode: payload.episode,
            }),
      );
    } catch {
      setError(feedback("home.saveProgressFailed"));
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
    error: format(error),
    notice: format(notice),
    status: format(status),
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
