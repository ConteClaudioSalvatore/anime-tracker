import { Dimensions, Platform, StyleSheet } from "react-native";

import { ThemedView } from "@/components/themed-view";
import { WEBSITE_URI } from "@/constants/website";
import { AppStore, StoreContext } from "@/utils";
import { Button } from "@react-navigation/elements";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { WebViewNavigationEvent } from "react-native-webview/lib/RNCWebViewNativeComponent";

const WATCH_MODE_JS = (
  possibleResume: {
    episode: number;
    progress?: number;
  } | null,
) => `
function debounceFunction(f, time) {
  let timeout = null;
  return (...args) => {
    if(timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      f.apply(this, args);
    }, time)
  }
}
const getCurrentEpisode = (ep) => +(ep ?? document.querySelector('.episodes > .episode > a.active')?.textContent ?? 0);
const notifyAnimeEpisode = (videoData, ep, url) => {
  const { progress = null, total = null } = videoData ?? {};
  const animeTitle = document.querySelector('#anime-title.title')?.textContent;
  const episode = getCurrentEpisode(ep);
  const infoKeys = [];
  const infoValues = [];
  document.querySelectorAll('.info > .row > .meta > dt, .info > .row > .meta > dd').forEach((el) => {
    if(el.nodeName === 'DT') {
      infoKeys.push(el.textContent.slice(0, -1))
    }
    if(el.nodeName === 'DD') {
      infoValues.push(el.textContent)
    }
  });
  const info = Object.fromEntries(infoKeys.map((k, i) => [k, infoValues[i]]));
  
  window.ReactNativeWebView.postMessage(
    JSON.stringify({ type: 'anime-found', payload: { episode, animeTitle, info, progress, total, url } })
  );
}
const debouncedNAE = debounceFunction(notifyAnimeEpisode, 200);
let player = null;
const retrievePlayer = () => setInterval(() => {
  if(player) {
    clearInterval(interval);
    return;
  }
  player = document.querySelector('iframe#player-iframe')?.contentDocument.querySelector('video#video-player');
  if(!player) return;
  ${
    possibleResume?.progress
      ? `
  if(getCurrentEpisode() === ${possibleResume.episode}) {
    const playCallback = () => {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'anime-play', payload: ${JSON.stringify(possibleResume)} })
      );
      player.currentTime = ${possibleResume.progress};
      player.removeEventListener('play', playCallback);
    }
    player.addEventListener('play', playCallback);
  }
  `
      : ""
  }
  player.addEventListener('timeupdate', () => debouncedNAE({ progress: player.currentTime, total: player.duration }, null, location.href));
}, 500);
let interval = retrievePlayer();
notifyAnimeEpisode(null);
document.querySelectorAll('.episodes > .episode > a').forEach((e) => e.addEventListener('click', (event) => {
  notifyAnimeEpisode(null, event.target.textContent);
  player = null;
  window.ReactNativeWebView.postMessage(
    JSON.stringify({ type: 'anime-reload' })
  );
  interval = retrievePlayer();
}));
`;

const JS_TO_INJECT = (
  watchMode: boolean,
  possibleResume: Parameters<typeof WATCH_MODE_JS>[0],
) => `
if(!document.querySelector('head > link[rel=stylesheet]#aw-theme-1')) {
  const roundedTheme = document.createElement('link');
  roundedTheme.setAttribute('rel', 'stylesheet');
  roundedTheme.setAttribute('href', 'https://static.animeworld.ac/dist/frontend/themes/theme-1.css');
  roundedTheme.setAttribute('id', 'aw-theme-1');
  document.querySelector('head').append(roundedTheme);
}
${watchMode ? WATCH_MODE_JS(possibleResume) : ""}
`;

const WATCH_MODE_MATCHER = new RegExp(
  "^" + WEBSITE_URI.replace(".ac/", String.raw`.\w+/play`),
);

export default function HomeScreen() {
  const ref = React.useRef<WebView>(null);
  const { url, ...params } = useLocalSearchParams();
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
    if (currentAnime) {
      return {
        episode: currentAnime.episode,
        progress:
          state[currentAnime.animeName]?.episodeProgress?.[currentAnime.episode]
            .progress,
      };
    }
    return null;
  }, [currentAnime, state]);
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

  const onMessage = (e: WebViewMessageEvent) => {
    if (!e.nativeEvent.data) return;
    const message = JSON.parse(e.nativeEvent.data);
    if (message.type === "anime-reload") {
      ref.current?.injectJavaScript(JS_TO_INJECT(watchMode, resume));
      ref.current?.reload();
    }
    if (message.type !== "anime-found") return;
    const payload: {
      animeTitle: string;
      episode: number;
      info: any;
      progress: number;
      total: number;
      url?: string;
    } = message.payload;
    setCurrentAnime({
      animeName: payload.animeTitle,
      episode: payload.episode,
    });
    AppStore.Update((prev) => ({
      ...prev,
      [payload.animeTitle]: {
        highestWatchedEpisode:
          (prev[payload.animeTitle]?.highestWatchedEpisode ?? 0) >
          payload.episode
            ? prev[payload.animeTitle].highestWatchedEpisode
            : payload.episode,
        latestWatchedEpisode: payload.episode,
        latestVisitedUrl: payload.url ?? (url as string),
        total: +payload.info["Episodi"],
        episodeProgress: {
          ...prev[payload.animeTitle]?.episodeProgress,
          [payload.episode]: {
            progress:
              payload.progress ??
              prev[payload.animeTitle]?.episodeProgress?.[payload.episode]
                .progress,
            total:
              payload.total ??
              prev[payload.animeTitle]?.episodeProgress?.[payload.episode]
                .total,
          },
        },
      },
    })).then(stateChanged);
  };

  const onShouldStart = (e: WebViewNavigationEvent) => {
    return e.url.startsWith(WEBSITE_URI);
  };

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={ref}
        source={{ uri: url as string }}
        onNavigationStateChange={onNavigation}
        onShouldStartLoadWithRequest={onShouldStart}
        injectedJavaScript={JS_TO_INJECT(watchMode, resume)}
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
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled
        onOpenWindow={() => false}
        bounces={true}
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
    </SafeAreaView>
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
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    ...Platform.select({
      ios: {
        marginBottom: -35,
      },
    }),
  },
});
