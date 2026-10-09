import { useAppTranslation } from "@/hooks/use-app-translation";
import React from "react";
import { Platform, StyleSheet, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import WebView from "react-native-webview";
import ActionButton from "@/components/provider-creator/action-button";
import ProviderSurface from "@/components/provider-creator/provider-surface";
import NavigationAccessory from "@/components/navigation-accessory";
import ProviderChooser from "@/components/home/provider-chooser";
import BrowserSheet from "@/components/home/browser-sheet";
import { useHomeBrowser } from "@/hooks/use-home-browser";
import { useProviderPalette } from "@/hooks/use-provider-palette";

export default function HomeScreen() {
  const t = useAppTranslation();
  const {
    provider,
    providers,
    url,
    browserSheet,
    webViewRef,
    webViewGeneration,
    injection,
    loading,
    error,
    notice,
    status,
    open,
    setSheet,
    dismissNotice,
    onLoadStart,
    onLoadEnd,
    onError,
    onHttpError,
    onNavigationStateChange,
    onMessage,
    onContentProcessDidTerminate,
    onRenderProcessGone,
    shouldNavigate,
  } = useHomeBrowser();
  const router = useRouter();
  const colors = useProviderPalette();
  const bg = colors.bg;
  const fg = colors.text;
  const chooser = (
    <ProviderChooser
      providers={providers}
      missingProvider={!!url && !provider}
      onOpen={open}
      onAdd={() => {
        setSheet();
        router.navigate("/provider-creator");
      }}
    />
  );
  // Keep the iOS browser wrappers layout-only; styled wrappers break native tab minimization.
  return (
    <View
      style={[
        styles.screen,
        !provider && { backgroundColor: bg },
        Platform.OS === "android" && {
          paddingTop: StatusBar.currentHeight,
          backgroundColor: provider ? "#000" : bg,
        },
      ]}
    >
      {!provider ? (
        <SafeAreaView style={styles.screen}>{chooser}</SafeAreaView>
      ) : (
        <>
          <WebView
            key={`${provider.id}:${webViewGeneration}`}
            ref={webViewRef}
            source={{ uri: url! }}
            style={[styles.screen, styles.webView]}
            containerStyle={Platform.OS === "ios" ? undefined : styles.browser}
            contentInsetAdjustmentBehavior="always"
            scrollEnabled
            bounces
            injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
            injectedJavaScriptForMainFrameOnly={false}
            injectedJavaScriptBeforeContentLoaded={injection}
            injectedJavaScript={injection}
            onLoadStart={onLoadStart}
            onLoadEnd={onLoadEnd}
            onError={onError}
            onHttpError={onHttpError}
            onNavigationStateChange={onNavigationStateChange}
            onShouldStartLoadWithRequest={shouldNavigate}
            onMessage={onMessage}
            onContentProcessDidTerminate={onContentProcessDidTerminate}
            onRenderProcessGone={onRenderProcessGone}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            setSupportMultipleWindows
            onOpenWindow={() => {
              /* Keep pop-ups separate from provider navigation. */
            }}
          />
          {Platform.OS !== "ios" && (
            <SafeAreaView
              edges={["left", "right"]}
              pointerEvents="box-none"
              style={[
                styles.androidAccessory,
                { backgroundColor: colors.card },
              ]}
            >
              <NavigationAccessory />
            </SafeAreaView>
          )}
          {!!(error || notice) && (
            <ProviderSurface
              style={[
                styles.notice,
                { backgroundColor: colors.card },
                Platform.OS !== "ios" && { bottom: 76 },
              ]}
            >
              <Text
                accessibilityRole="alert"
                numberOfLines={3}
                style={{ color: fg, flex: 1 }}
              >
                {error || notice}
              </Text>
              <ActionButton
                label={t("common.dismiss")}
                onPress={dismissNotice}
              />
            </ProviderSurface>
          )}
        </>
      )}
      <BrowserSheet
        sheet={browserSheet}
        provider={provider}
        url={url}
        loading={loading}
        status={status}
        error={error}
        notice={notice}
        onClose={() => setSheet()}
        onChooseWebsite={() => setSheet("providers")}
      >
        {chooser}
      </BrowserSheet>
    </View>
  );
}
const styles = StyleSheet.create({
  browser: { backgroundColor: "#000" },
  webView: { backgroundColor: "transparent" },
  screen: { flex: 1 },
  androidAccessory: {
    height: 64,
    flexShrink: 0,
  },
  notice: {
    position: "absolute",
    bottom: 8,
    left: 12,
    right: 12,
    padding: 10,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
