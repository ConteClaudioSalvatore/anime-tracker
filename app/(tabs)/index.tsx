import { Platform, StyleSheet, View } from "react-native";

import { WEBSITE_URI } from "@/constants/website";
import { AppStore, StoreContext } from "@/utils";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { WebViewNavigationEvent } from "react-native-webview/lib/RNCWebViewNativeComponent";

import debounceFunction from "@/assets/js/debounce-function_t.cjs";
import loadRoundedTheme from "@/assets/js/load-rounded-theme_t.cjs";
import notifyAnimeEpisode from "@/assets/js/notify-anime-episode_t.cjs";
import { ThemedView } from "@/components/themed-view";
import { AnimePayload, EpisodeProgress } from "@/model";
import { animeUpdated } from "@/store/app.actions";
import { Button } from "@react-navigation/elements";

const WATCH_MODE_JS = (
  possibleResume:
    | ({
        episode: number;
      } & Partial<EpisodeProgress>)
    | null,
  episodes: ({ episode: number } & EpisodeProgress)[],
) => `
// variables are declared without let/const/var to ensure they can be overridden without causing errors
episodes = ${JSON.stringify(episodes)};
debouncedNAE = debounceFunction(notifyAnimeEpisode, 200);
possibleResume = ${JSON.stringify(possibleResume)};
player = null;
retrievePlayer = () => setInterval(() => {
  if(player) {
    clearInterval(interval);
    return;
  }
  player = document.querySelector('iframe#player-iframe')?.contentDocument.querySelector('video#video-player');
  if(!player) return;
  if(possibleResume?.progress && getCurrentEpisode() === possibleResume.episode) {
    const playCallback = () => {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'anime-play', payload: possibleResume })
      );
      player.currentTime = possibleResume.progress;
      player.removeEventListener('play', playCallback);
    }
    player.addEventListener('play', playCallback);
  }
  player.addEventListener('timeupdate', () => debouncedNAE({ progress: player.currentTime, total: player.duration }, null, location.href));
}, 500);
interval = retrievePlayer();
notifyAnimeEpisode(null);
function clickActionHandler(event) {
  player = null;
  window.ReactNativeWebView.postMessage(
    JSON.stringify({ type: 'anime-reload' })
  );
  interval = retrievePlayer();
}
document.querySelectorAll('.episodes > .episode > a').forEach((e) => {
  e.addEventListener('click', (event) => {
    notifyAnimeEpisode(null, event.target.textContent);
    clickActionHandler(event);
  });
  const episodeIndex = episodes.findIndex(x => x.episode === +e.textContent);
  if(episodeIndex === -1) return;
  const episode = episodes[episodeIndex];
  if(episode.progress + episode.total === 0) return;
  const progress = (episode.progress / episode.total * 100).toFixed();
  e.style.backgroundImage = \`linear-gradient(to right, #00d30045 \${progress}%, transparent \${progress}%, transparent)\`;
});
document.querySelectorAll('#controls > .control.prevnext').forEach(
  (e) => e.addEventListener('click', (e) => {
    setTimeout(() => clickActionHandler(e), 0);
  })
);
`;

const JS_TO_INJECT = (
  watchMode: boolean,
  possibleResume: Parameters<typeof WATCH_MODE_JS>[0],
  episodes: Parameters<typeof WATCH_MODE_JS>[1] = [],
) =>
  `${loadRoundedTheme}${watchMode ? WATCH_MODE_JS(possibleResume, episodes) : ""}`;

/**
 * A regex matching the url only when in play mode
 */
const WATCH_MODE_MATCHER = new RegExp(
  "^" + WEBSITE_URI.replace(".ac/", String.raw`.\w+/play`),
);

export default function HomeScreen() {
  const ref = React.useRef<WebView>(null);
  const { url = WEBSITE_URI, ...params } = useLocalSearchParams();
  const canGoForward = Boolean(Number(params.canGoForward));
  const canGoBack = Boolean(Number(params.canGoBack));
  const [currentAnime, setCurrentAnime] = React.useState<{
    episode: number;
    animeName: string;
  } | null>(null);
  const { state, stateChanged } = React.useContext(StoreContext);
  const resume = React.useMemo<
    Parameters<typeof WATCH_MODE_JS>[0] | null
  >(() => {
    if (!currentAnime) return null;
    return {
      episode: currentAnime.episode,
      progress:
        state[currentAnime.animeName]?.episodeProgress?.[currentAnime.episode]
          ?.progress,
    };
  }, [currentAnime, state]);
  const playedEpisodes = React.useMemo<
    ({ episode: number } & EpisodeProgress)[]
  >(() => {
    if (!currentAnime) return [];
    return Object.entries(
      state[currentAnime.animeName]?.episodeProgress ?? {},
    ).map(([ep, progressInfo]) => ({
      episode: +ep,
      ...progressInfo,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAnime]);
  const router = useRouter();
  const watchMode = !!WATCH_MODE_MATCHER.exec(url as string);

  const onNavigation = (e: WebViewNavigationEvent) => {
    if (url === e.url) return;
    router.setParams({
      url: e.url,
      canGoBack: Number(e.canGoBack),
      canGoForward: Number(e.canGoForward),
    });
  };

  const onMessage = async (e: WebViewMessageEvent) => {
    if (!e.nativeEvent.data) return;
    const message = JSON.parse(e.nativeEvent.data);
    if (message.type === "anime-reload") {
      ref.current?.reload();
    }
    if (message.type !== "anime-found") return;
    const payload: AnimePayload = message.payload;
    setCurrentAnime({
      animeName: payload.animeTitle,
      episode: payload.episode,
    });
    await AppStore.Dispatch(animeUpdated(url as string, payload)).then(
      stateChanged,
    );
  };

  const onShouldStart = (e: WebViewNavigationEvent) => {
    return e.url.startsWith(WEBSITE_URI);
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={ref}
        source={{ uri: url as string }}
        onNavigationStateChange={onNavigation}
        onShouldStartLoadWithRequest={onShouldStart}
        injectedJavaScriptBeforeContentLoaded={`${debounceFunction}${notifyAnimeEpisode}`}
        injectedJavaScript={JS_TO_INJECT(watchMode, resume, playedEpisodes)}
        onMessage={onMessage}
        onLoadEnd={() => {
          if (!params.reload) return;
          router.replace({
            pathname: "/",
            params: {
              url,
              canGoBack: Number(canGoBack),
              canGoForward: Number(canGoBack),
            },
          });
          if (Platform.OS === "ios") {
            ref.current?.reload();
          }
        }}
        contentInsetAdjustmentBehavior="always"
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled
        webviewDebuggingEnabled
        onOpenWindow={() => false}
        useWebView2
        bounces={true}
        {...(Platform.OS === "android"
          ? {
              allowsFullscreenVideo: true,
              allowsInlineMediaPlayback: true,
            }
          : {})}
      ></WebView>
      <ThemedView style={styles.buttons}>
        <Button
          disabled={!canGoBack}
          variant={canGoBack ? "tinted" : "plain"}
          onPress={() => ref.current?.goBack()}
        >
          &lt;
        </Button>
        <Button onPress={() => ref.current?.reload()}>&#10226;</Button>
        <Button
          variant="plain"
          onPress={() => {
            router.setParams({
              url: WEBSITE_URI,
            });
          }}
        >
          AW Home
        </Button>
        <Button
          disabled={!canGoForward}
          variant={canGoForward ? "tinted" : "plain"}
          onPress={() => ref.current?.goForward()}
        >
          &gt;
        </Button>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  buttons: {
    justifyContent: "space-between",
    flexDirection: "row",
    paddingBlock: 8,
    paddingInline: 12,
  },
  container: {
    flex: 1,
    flexDirection: "column",
  },
});
