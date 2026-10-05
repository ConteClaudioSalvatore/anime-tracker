import { useAppLocalization } from "@/hooks/use-app-localization";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AppState, AppStoreState } from "@/model";
import { AccessoryContext, AppStore, StoreContext } from "@/utils";
import { AppStateContext } from "@/utils/app-state.util";
import React from "react";
import WebView from "react-native-webview";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  useAppLocalization();
  const t = useAppTranslation();
  const colorScheme = useColorScheme();

  const [storeState, setStoreState] = React.useState<AppStoreState>({
    anime: {},
    providers: [],
  });
  const [appState, setAppState] = React.useState<AppState>({});
  const webViewRef = React.useRef<WebView>(null);

  const stateChanged = async () => {
    setStoreState(await AppStore.Get());
  };

  const contextData = React.useMemo<
    typeof StoreContext extends React.Context<infer T> ? T : never
  >(
    () => ({
      state: storeState,
      stateChanged,
    }),
    [storeState],
  );

  React.useEffect(() => {
    AppStore.Get().then((state) => {
      setStoreState(state);
      const provider = state.providers.find((item) => item.isDefault);
      if (provider)
        setAppState((previous) =>
          previous.url
            ? previous
            : { url: provider.origin, providerId: provider.id },
        );
    });
  }, []);

  const appStateContextValue = React.useMemo(
    () => ({ state: appState, updateState: setAppState }),
    [appState],
  );

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <StoreContext.Provider value={contextData}>
        <AppStateContext.Provider value={appStateContextValue}>
          <AccessoryContext
            value={{
              webViewRef,
            }}
          >
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="anime-modal"
                options={{
                  presentation: "modal",
                  title: t("navigation.animeModal"),
                }}
              />
              <Stack.Screen
                name="provider-creator"
                options={{ presentation: "modal", title: t("provider.add") }}
              />
            </Stack>
            <StatusBar style="auto" />
          </AccessoryContext>
        </AppStateContext.Provider>
      </StoreContext.Provider>
    </ThemeProvider>
  );
}
