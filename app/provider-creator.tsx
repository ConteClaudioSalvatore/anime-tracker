import { ProviderCreatorRegistry } from "@/components/provider-creator";
import { Provider, ProviderCreatorStep } from "@/model";
import { upsertProvider } from "@/store/app.actions";
import { AppStore, EventEmitter, StoreContext } from "@/utils";
import { ProviderCreatorContext } from "@/utils/provider-creator.utils";
import { useRouter } from "expo-router";
import { useLocalSearchParams } from "expo-router/build/hooks";
import React from "react";
import { Alert, Platform, useWindowDimensions, View } from "react-native";
import WebView from "react-native-webview";

const BASE_JS_TO_INJECT = `
  window.prevTarget = null;
  window.prevTargetBorder = null;
  window.currentTree = [];
  /**
   * Selects the target element and posts a message to the WebView.
   * @param target {HTMLElement | null} The target element to select.
   */
  window.selectTarget = (target, resetTree = true) => {
    if(window.prevTarget === target) {
      return;
    }
    if(window.prevTarget) window.prevTarget.style.border = window.prevTargetBorder;
    window.prevTarget = target;
    window.prevTargetBorder = target?.style.border ?? '';
    if(target) target.style.border = '1px dashed red';
    if(resetTree) {
      window.currentTree = [];
    }
    if(target) {
      const targetClasses = [...target.classList.values()];
      const index = target.parentElement ? [...target.parentElement.children].indexOf(target) + 1 : 1;
      window.currentTree = [
        \`\${target.nodeName}:nht-child(\${index})\${
          targetClasses.length > 0 ?
            ['', ...targetClasses].join('.') :
            ''
        }\$\`,
        ...window.currentTree
      ];
    }
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'targetChange',
      targetClass: target?.className,
      targetContent: target?.innerText,
      targetTree: window.currentTree.join(' > ')
    }));
  };
  document.addEventListener('click', (e) => {
    window.selectTarget(e.target, true);
  });
  document.addEventListener('message', (e) => {
    const data = JSON.parse(e.data);
    if(data.type === 'untarget') {
      window.selectTarget(null, true);
      return;
    }
    if(data.type !== 'targetParent' || !window.prevTarget.parentNode) return;
    window.selectTarget(window.prevTarget.parentNode, false);
  });
`;

export default function ProviderCreator_Screen() {
  const [providerDraft, setProviderDraft] = React.useState<Provider<false>>({
    id: 0,
    isDefault: false,
    whiteListedOrigins: [],
    // name: null,
    // origin: null,
    // animePageOrigin: null,
    // animeNameSelector: null,
    // episodeNameSelector: null,
    // episodeNumberSelector: null,
    // totalEpisodesSelector: null,
    // playerSelector: null,
    name: "ac",
    origin: "https://animeworld.ac",
    animePageOrigin: "https://animeworld.ac/play",
    animeNameSelector: null,
    seriesNameSelector: null,
    episodeNumberSelector: null,
    totalEpisodesSelector: null,
    playerSelector: null,
  });
  const webViewRef = React.useRef<WebView>(null);
  const webViewEvents = React.useRef(
    new EventEmitter<{
      targetChange: {
        type: "targetChange";
        targetClass?: string;
        targetContent?: string;
        targetTree: string;
      };
    }>(),
  );
  const [currentUri, setCurrentUri] = React.useState<string | null>(null);
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [step, setStep] = React.useState<ProviderCreatorStep>(
    ProviderCreatorStep.SeriesNameLearner,
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

  React.useEffect(() => {
    if (!providerDraft.origin) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUri(providerDraft.origin);
  }, [providerDraft.origin]);

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
        step,
        webViewEvents,
      }}
    >
      {step !== ProviderCreatorStep.Info &&
        step !== ProviderCreatorStep.Done &&
        providerDraft.origin && (
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
              injectedJavaScriptBeforeContentLoaded={
                [
                  ProviderCreatorStep.SeriesNameLearner,
                  ProviderCreatorStep.EpisodeNumberLearner,
                  ProviderCreatorStep.TotalEpisodesLearner,
                  ProviderCreatorStep.PlayerLearner,
                ].includes(step)
                  ? `${BASE_JS_TO_INJECT}true;`
                  : undefined
              }
              onMessage={(e) => {
                const data = e.nativeEvent.data;
                if (!data) return;
                const parsed = JSON.parse(data);
                webViewEvents.current.emit("targetChange", parsed);
              }}
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
