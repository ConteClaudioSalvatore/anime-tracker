import { ProviderCreatorRegistry } from "@/components/provider-creator";
import { Provider, ProviderCreatorStep } from "@/model";
import { upsertProvider } from "@/store/app.actions";
import { AppStore, StoreContext } from "@/utils";
import { ProviderCreatorContext } from "@/utils/provider-creator.utils";
import { Button, Host, Row, Text } from "@expo/ui";
import { fillMaxWidth, weight } from "@expo/ui/jetpack-compose/modifiers";
import { Stack, useRouter } from "expo-router";
import { useLocalSearchParams, usePathname } from "expo-router/build/hooks";
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

export default function ProviderCreator_Screen() {
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
  const [currentUri, setCurrentUri] = React.useState<string | null>(null);
  const { width } = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = React.useState<ProviderCreatorStep>(
    ProviderCreatorStep.Info,
  );
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

  console.log(pathname, providerDraft.origin);

  return (
    <ProviderCreatorContext.Provider
      value={{
        providerDraft,
        updateProviderDraft: setProviderDraft,
        saveProvider: onSaveProvider,
        cancelProviderCreation: onCancelProviderCreation,
        updateStep: setStep,
        webView: webViewRef,
        currentUri,
      }}
    >
      {step !== ProviderCreatorStep.Info && providerDraft.origin && (
        <View
          style={{
            width,
            flex: 1,
          }}
        >
          <WebView
            ref={webViewRef}
            style={{ backgroundColor: "transparent" }}
            source={{ uri: providerDraft.origin }}
            onNavigationStateChange={(e) => {
              setCurrentUri(e.url);
            }}
            // onShouldStartLoadWithRequest={onShouldStart}
            // injectedJavaScript={JS_TO_INJECT(watchMode, resume, playedEpisodes)}
            // onMessage={onMessage}
            onLoadEnd={(e) => {
              // if (!params.reload) return;
              // updateState({
              //   url,
              //   canGoBack,
              //   canGoForward,
              // });
              // if (Platform.OS === "ios") {
              //   webViewRef?.current?.reload();
              // }
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
                }
              : {})}
          />
        </View>
      )}
      {React.createElement(ProviderCreatorRegistry[step])}
    </ProviderCreatorContext.Provider>
  );
}
