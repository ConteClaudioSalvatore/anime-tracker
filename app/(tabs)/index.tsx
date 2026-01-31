import { Button, Dimensions, View } from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { Storage } from "@/utils";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { WebViewNavigationEvent } from "react-native-webview/lib/RNCWebViewNativeComponent";

const WEBSITE_URI = "https://www.animeworld.ac";

export default function HomeScreen() {
  const ref = React.useRef<WebView>(null);
  const [url, setUrl] = React.useState<string>(WEBSITE_URI);
  const [watchMode, setWatchMode] = React.useState(false);
  const [animeState, setAnimeState] = React.useState<
    Record<string, { watched: string[] }>
  >({});
  const fetchingState = React.useRef<boolean>(false);

  const onNavigation = (e: WebViewNavigationEvent) => {
    setUrl(e.url);
    const inWatchMode = e.url.startsWith(`${WEBSITE_URI}/play`);
    setWatchMode(inWatchMode);
    if (!inWatchMode) return;
  };

  const onMessage = (e: any) => {
    if (!e.nativeEvent?.data) return;
    const message = JSON.parse(e.nativeEvent.data);
    if (message.type !== "anime-found") return;
    setAnimeState((prev) => {
      const next = {
        ...prev,
        [message.payload.animeTitle]: {
          watched: [
            ...new Set([
              ...(prev[message.payload.animeTitle]?.watched ?? []),
              message.payload.episode,
            ]),
          ],
        },
      };
      Storage.setItem("state", next);
      console.log("next", next);
      return next;
    });
    console.log(message);
  };

  const onShouldStart = (e: WebViewNavigationEvent) => {
    return e.url.startsWith(WEBSITE_URI);
  };

  React.useEffect(() => {
    fetchingState.current = true;
    Storage.getItem<typeof animeState>("state").then((x) => {
      fetchingState.current = false;
      console.log("stored", x);
      return x ?? {};
    });
  }, []);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
    >
      <SafeAreaView
        style={{
          flex: 1,
          width: Dimensions.get("screen").width,
          height: Dimensions.get("screen").height,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Button title="<" onPress={() => ref.current?.goBack()} />
          <Button title="reload" onPress={() => ref.current?.reload()} />
          <Button title=">" onPress={() => ref.current?.goForward()} />
        </View>
        <WebView
          ref={ref}
          source={{ uri: url }}
          onNavigationStateChange={onNavigation}
          onShouldStartLoadWithRequest={onShouldStart}
          injectedJavaScript={
            watchMode
              ? `
              const notifyANime = () => {
                const animeTitle = document.querySelector('#anime-title.title')?.textContent;
                const episode = document.querySelector('.episodes > .episode > a.active')?.textContent;
                window.ReactNativeWebView.postMessage(
                  JSON.stringify({ type: 'anime-found', payload: { episode, animeTitle } })
                );
              }
              notifyAnime();
              document.querySelectorAll('.episodes > .episode > a').forEach((e) => e.on('click', notifyAnime))
              `
              : undefined
          }
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
        ></WebView>
      </SafeAreaView>
    </ParallaxScrollView>
  );
}
