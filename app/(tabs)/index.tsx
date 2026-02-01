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

const WATCH_MODE_JS = `
const notifyAnimeEpisode = (ep) => {
  const animeTitle = document.querySelector('#anime-title.title')?.textContent;
  const episode = +(ep ?? document.querySelector('.episodes > .episode > a.active')?.textContent ?? 0);
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
    JSON.stringify({ type: 'anime-found', payload: { episode, animeTitle, info } })
  );
}
notifyAnimeEpisode();
document.querySelectorAll('.episodes > .episode > a').forEach((e) => e.addEventListener('click', (event) => notifyAnimeEpisode(event.target.textContent)))
`;

const JS_TO_INJECT = (watchMode: boolean) => `
const THEME_COOKIE = 'theme=dark;path=/;';
const THEME_REGEXP = /theme=(\\w+);path=\\/;/;
if(THEME_REGEXP.exec(document.cookie)) {
  document.cookie = \`\${THEME_COOKIE}\${document.cookie.replace(THEME_REGEXP, '')}\`;
}
if(!document.querySelector('head > link[rel=stylesheet]#aw-theme-1')) {
  const roundedTheme = document.createElement('link');
  roundedTheme.setAttribute('rel', 'stylesheet');
  roundedTheme.setAttribute('href', 'https://static.animeworld.ac/dist/frontend/themes/theme-1.css');
  roundedTheme.setAttribute('id', 'aw-theme-1');
  document.querySelector('head').append(roundedTheme);
}
${watchMode ? WATCH_MODE_JS : ""}
`;

const WATCH_MODE_MATCHER = new RegExp(
  "^" + WEBSITE_URI.replace(".ac/", String.raw`.\w+/play`),
);

export default function HomeScreen() {
  const ref = React.useRef<WebView>(null);
  const { url, ...params } = useLocalSearchParams();
  const canGoForward = Boolean(Number(params.canGoForward));
  const canGoBack = Boolean(Number(params.canGoBack));
  const router = useRouter();
  const { stateChanged } = React.useContext(StoreContext);
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
    if (message.type !== "anime-found") return;
    const payload: {
      animeTitle: string;
      episode: number;
      info: any;
    } = message.payload;
    AppStore.Update((prev) => ({
      ...prev,
      [payload.animeTitle]: {
        latestWatchedEpisode:
          (prev[payload.animeTitle]?.latestWatchedEpisode ?? 0) >
          payload.episode
            ? prev[payload.animeTitle].latestWatchedEpisode
            : payload.episode,
        latestVisitedUrl: url as string,
        total: +payload.info["Episodi"],
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
        injectedJavaScript={JS_TO_INJECT(watchMode)}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled
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
