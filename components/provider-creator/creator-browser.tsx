import { ActivityIndicator, Text, View } from "react-native";
import WebView from "react-native-webview";
import runtime from "@/assets/js/provider-runtime_t.cjs";
import type { ProviderCreator } from "@/hooks/provider-creator/use-provider-creator";
import ActionButton from "./action-button";
import ProviderSurface from "./provider-surface";
import { styles } from "./creator-styles";

type Props = { creator: Pick<ProviderCreator, "colors" | "state" | "browser"> };
export function CreatorBrowser({ creator }: Props) {
  const { colors, state, browser } = creator;
  const { draft, saving } = state.setup;
  const { source, url, navigationState, loading } = state.browser;
  const { webView, session, shouldNavigate } = browser;
  return (
    <View style={styles.browser}>
      <ProviderSurface
        style={[
          styles.toolbar,
          { backgroundColor: colors.card },
          styles.iosSurface,
        ]}
      >
        <Text
          numberOfLines={1}
          accessibilityLabel={"Website address " + url}
          style={{ color: colors.muted, flex: 1, fontSize: 12 }}
        >
          {url}
        </Text>
        <View style={styles.row}>
          {
            <ActionButton
              label="Back"
              variant="tertiary"
              accessibilityLabel="Browser back"
              onPress={() => webView.current?.goBack()}
              disabled={!navigationState.back || saving}
            />
          }
          {
            <ActionButton
              label={"Forward"}
              variant="tertiary"
              onPress={() => webView.current?.goForward()}
              disabled={!navigationState.forward || saving}
            />
          }
          {
            <ActionButton
              label={"Reload"}
              variant="tertiary"
              onPress={() => webView.current?.reload()}
              disabled={saving}
            />
          }
        </View>
        {loading && <ActivityIndicator accessibilityLabel="Loading website" />}
      </ProviderSurface>
      <WebView
        ref={webView}
        source={{ uri: source }}
        style={styles.screen}
        injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
        injectedJavaScriptForMainFrameOnly={false}
        injectedJavaScriptBeforeContentLoaded={
          "window.__providerSession=" +
          JSON.stringify(session) +
          ";if(window===window.top){window.__providerConfig=" +
          JSON.stringify(draft) +
          ";window.__runtimeMode='setup';}" +
          runtime +
          ";true;"
        }
        injectedJavaScript={
          "window.__providerSession=" +
          JSON.stringify(session) +
          ";if(window===window.top){window.__providerConfig=" +
          JSON.stringify(draft) +
          ";window.__runtimeMode='setup';}" +
          runtime +
          ";true;"
        }
        onLoadStart={creator.browser.onLoadStart}
        onLoadEnd={creator.browser.onLoadEnd}
        onError={creator.browser.onError}
        onHttpError={creator.browser.onHttpError}
        onNavigationStateChange={creator.browser.onNavigationStateChange}
        onMessage={creator.browser.onMessage}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows
        onOpenWindow={() => {
          /* Block pop-ups without changing the current page or warning. */
        }}
        onShouldStartLoadWithRequest={shouldNavigate}
      />
    </View>
  );
}
