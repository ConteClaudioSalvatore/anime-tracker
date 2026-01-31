import { Dimensions, Platform, StyleSheet } from "react-native";

import { ThemedView } from "@/components/themed-view";
import { AppStore, StoreContext } from "@/utils";
import { Button } from "@react-navigation/elements";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { WebViewNavigationEvent } from "react-native-webview/lib/RNCWebViewNativeComponent";

const WEBSITE_URI = "https://www.animeworld.ac";

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

export default function HomeScreen() {
  const ref = React.useRef<WebView>(null);
  const { stateChanged } = React.useContext(StoreContext);
  const [url, setUrl] = React.useState<string>(WEBSITE_URI);
  const [can, setCan] = React.useState({
    goBack: false,
    goForward: false,
  });
  const [watchMode, setWatchMode] = React.useState(false);

  const onNavigation = (e: WebViewNavigationEvent) => {
    setUrl(e.url);
    setCan({
      goBack: e.canGoBack,
      goForward: e.canGoForward,
    });
    const inWatchMode = e.url.startsWith(`${WEBSITE_URI}/play`);
    setWatchMode(inWatchMode);
    if (!inWatchMode) return;
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
        source={{ uri: url }}
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
          disabled={!can.goBack}
          variant={can.goBack ? "tinted" : "plain"}
          onPress={() => ref.current?.goBack()}
        >
          &lt;
        </Button>
        <Button onPress={() => ref.current?.reload()}>&#10226;</Button>
        <Button
          variant="plain"
          onPress={() => {
            setUrl(WEBSITE_URI);
            ref.current?.reload();
          }}
        >
          AW Home
        </Button>
        <Button
          disabled={!can.goForward}
          variant={can.goForward ? "tinted" : "plain"}
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
