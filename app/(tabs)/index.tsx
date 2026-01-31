import { Button, Dimensions, StyleSheet } from "react-native";

import { ThemedView } from "@/components/themed-view";
import { AppStore } from "@/utils";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { WebViewNavigationEvent } from "react-native-webview/lib/RNCWebViewNativeComponent";

const WEBSITE_URI = "https://www.animeworld.ac";

const WATCH_MODE_JS = `
const notifyAnimeEpisode = (ep) => {
  const animeTitle = document.querySelector('#anime-title.title')?.textContent;
  const episode = ep ?? document.querySelector('.episodes > .episode > a.active')?.textContent;
  window.ReactNativeWebView.postMessage(
    JSON.stringify({ type: 'anime-found', payload: { episode, animeTitle } })
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
  const [url, setUrl] = React.useState<string>(WEBSITE_URI);
  const [watchMode, setWatchMode] = React.useState(false);

  const onNavigation = (e: WebViewNavigationEvent) => {
    setUrl(e.url);
    const inWatchMode = e.url.startsWith(`${WEBSITE_URI}/play`);
    setWatchMode(inWatchMode);
    if (!inWatchMode) return;
  };

  const onMessage = (e: WebViewMessageEvent) => {
    if (!e.nativeEvent.data) return;
    const message = JSON.parse(e.nativeEvent.data);
    if (message.type !== "anime-found") return;
    AppStore.Update((prev) => ({
      ...prev,
      [message.payload.animeTitle]: {
        watched: [
          ...new Set([
            ...(prev[message.payload.animeTitle]?.watched ?? []),
            message.payload.episode,
          ]),
        ],
      },
    }));
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
        <Button title="<" onPress={() => ref.current?.goBack()} />
        <Button title="reload" onPress={() => ref.current?.reload()} />
        <Button
          title="AW Home"
          onPress={() => {
            setUrl(WEBSITE_URI);
            ref.current?.reload();
          }}
        />
        <Button title=">" onPress={() => ref.current?.goForward()} />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  buttons: {
    justifyContent: "space-between",
    flexDirection: "row",
  },
  container: {
    flex: 1,
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    marginBottom: -35,
  },
});
