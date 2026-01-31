import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AppState } from "@/model";
import { AppStore, StoreContext } from "@/utils";
import React from "react";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [state, setState] = React.useState<AppState>({});

  const stateChanged = () => {
    AppStore.Get().then(setState);
  };

  const contextData = React.useMemo<
    typeof StoreContext extends React.Context<infer T> ? T : never
  >(
    () => ({
      state,
      stateChanged,
    }),
    [state],
  );

  React.useEffect(() => {
    stateChanged();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <StoreContext.Provider value={contextData}>
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
      </StoreContext.Provider>
    </ThemeProvider>
  );
}
