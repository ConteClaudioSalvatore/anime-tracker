import { Provider } from "@/model";
import { upsertProvider } from "@/store/app.actions";
import { AppStore, StoreContext } from "@/utils";
import { ProviderCreatorContext } from "@/utils/provider-creator.utils";
import { Button, Host, Row, Text } from "@expo/ui";
import { fillMaxWidth, weight } from "@expo/ui/jetpack-compose/modifiers";
import { Stack, useRouter } from "expo-router";
import { useLocalSearchParams } from "expo-router/build/hooks";
import React from "react";
import {
  Alert,
  Platform,
  StatusBar,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WebView from "react-native-webview";

const BASE_JS_TO_INJECT = `
  window.prevTarget = null;
  window.prevTargetBorder = null;
  /**
   * Selects the target element and posts a message to the WebView.
   * @param target {HTMLElement | null} The target element to select.
   */
  window.selectTarget = (target) => {
    if(window.prevTarget === target) {
      return;
    }
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'targetChange', target: target?.outerHTML }));
    if(window.prevTarget) window.prevTarget.style.border = window.prevTargetBorder;
    window.prevTarget = target;
    window.prevTargetBorder = target?.style.border ?? null;
    if(target) target.style.border = '1px dashed red';
  };
  document.addEventListener('click', (e) => {
    window.selectTarget(e.target);
  });
  window.addEventListener('message', (e) => {
    const data = JSON.parse(e.data);
    if(data.type === 'untarget') {
      window.selectTarget(null);
      return;
    }
    if(data.type !== 'selectParent' || !window.prevTarget.parentNode) return;
    window.selectTarget(window.prevTarget.parentNode);
  });
`;

export default function ProviderCreator() {
  const [providerDraft, setProviderDraft] = React.useState<Provider<false>>({
    id: 0,
    isDefault: false,
    whiteListedOrigins: [],
    name: null,
    origin: null,
    animePageOrigin: null,
    animeNameSelector: null,
    episodeNameSelector: null,
    episodeNumberSelector: null,
    totalEpisodesSelector: null,
    playerSelector: null,
  });
  const webViewRef = React.useRef<WebView>(null);
  const { width } = useWindowDimensions();
  const router = useRouter();
  const {
    state: { providers },
  } = React.useContext(StoreContext);
  const { id } = useLocalSearchParams<{
    id?: string;
  }>();

  const onSaveProvider = async () => {
    if (Object.values(providerDraft).some((x) => x === null)) {
      Alert.alert(
        "Incomplete Provider",
        "There are missing fields in the provider. Please complete all the steps before saving.",
      );
      return;
    }
    const parsedProvider = providerDraft as Provider;
    await AppStore.Dispatch(upsertProvider(parsedProvider));
  };

  const onCancelProviderCreation = () => {
    router.navigate("/settings");
  };

  React.useEffect(() => {
    if (!id) return;
    const provider = providers.find((p) => p.id === +id);
    if (!provider) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProviderDraft(provider);
  }, [id, providers]);

  return (
    <ProviderCreatorContext.Provider
      value={{
        providerDraft,
        updateProviderDraft: setProviderDraft,
        saveProvider: onSaveProvider,
        cancelProviderCreation: onCancelProviderCreation,
      }}
    >
      {providerDraft.origin && (
        <View
          style={{
            width,
          }}
        >
          <WebView
            ref={webViewRef}
            style={{ backgroundColor: "transparent" }}
            source={{ uri: providerDraft.origin }}
            // onNavigationStateChange={onNavigation}
            // onShouldStartLoadWithRequest={onShouldStart}
            // injectedJavaScript={JS_TO_INJECT(watchMode, resume, playedEpisodes)}
            // onMessage={onMessage}
            // onLoadEnd={() => {
            //   if (!params.reload) return;
            //   updateState({
            //     url,
            //     canGoBack,
            //     canGoForward,
            //   });
            //   if (Platform.OS === "ios") {
            //     webViewRef?.current?.reload();
            //   }
            // }}
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
                }
              : {})}
          />
        </View>
      )}
      <Stack
        screenOptions={{
          presentation: "pageSheet",
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="anime-page-learner" />
        <Stack.Screen name="episode-name-learner" />
        <Stack.Screen name="episode-number-learner" />
        <Stack.Screen name="total-episodes-learner" />
        <Stack.Screen name="player-learner" />
        <Stack.Screen name="done" />
      </Stack>
    </ProviderCreatorContext.Provider>
  );
}
