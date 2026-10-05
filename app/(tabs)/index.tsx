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
  const {
    provider,
    providers,
    url,
    browserSheet,
    webViewRef,
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
            key={provider.id}
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
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            setSupportMultipleWindows
            onOpenWindow={() => {
              /* Keep pop-ups separate from provider navigation. */
            }}
          />
          {Platform.OS !== "ios" && (
            <SafeAreaView
              edges={["bottom"]}
              pointerEvents="box-none"
              style={styles.androidAccessory}
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
              <ActionButton label="Dismiss" onPress={dismissNotice} />
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
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
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
