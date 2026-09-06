import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { WEBSITE_URI } from "@/constants/website";
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
  const colorScheme = useColorScheme();

  const [storeState, setStoreState] = React.useState<AppStoreState>({});
  const [appState, setAppState] = React.useState<AppState>({
    url: WEBSITE_URI,
  });
  const webViewRef = React.useRef<WebView>(null);

  const stateChanged = () => {
    AppStore.Get().then(setStoreState);
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
    stateChanged();
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
                  title: "Add/Edit Anime",
                }}
              />
            </Stack>
            <StatusBar style="auto" />
          </AccessoryContext>
        </AppStateContext.Provider>
      </StoreContext.Provider>
    </ThemeProvider>
  );
}
