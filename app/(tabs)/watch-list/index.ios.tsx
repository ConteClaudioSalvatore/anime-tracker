import WatchListHeader, {
  WatchListHeaderContext,
} from "@/components/watch-list/header";
import { Anime, AppStoreState } from "@/model";
import { removeAnime, toggleAnimeFinished } from "@/store/app.actions";
import {
  AppStore,
  computeTimeStamp,
  isAnimeFinished,
  onAnimeAction,
  onAnimeRemove,
  onClearHistory,
  Storage,
  StoreContext,
} from "@/utils";
import { AppStateContext } from "@/utils/app-state.util";

import {
  Button,
  Divider,
  Host,
  HStack,
  LazyVStack,
  ScrollView,
  Spacer,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  background,
  buttonStyle,
  cornerRadius,
  foregroundStyle,
  frame,
  multilineTextAlignment,
  padding,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  AlertButton,
  DynamicColorIOS,
  useWindowDimensions,
} from "react-native";

export default function WatchListScreen() {
  const { state: storeState, stateChanged } = React.useContext(StoreContext);
  const { updateState } = React.useContext(AppStateContext);
  const [searchValue, setSearchValue] = React.useState("");
  const [onlyInProgress, setOnlyInProgress] = React.useState(true);
  const [sortMode, setSortMode] = React.useState<1 | -1>(1);
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;

  const filteredState = React.useMemo(
    () =>
      Object.entries(storeState).filter(
        ([k, v]) =>
          k.toLowerCase().includes(searchValue.toLowerCase()) &&
          (onlyInProgress ? !(isAnimeFinished(v) || v.finished) : true),
      ),
    [storeState, searchValue, onlyInProgress],
  );

  const anyItems = React.useMemo(
    () => filteredState.length > 0,
    [filteredState],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "Watch History",
          headerStyle: {
            backgroundColor: "transparent",
          },
          headerTransparent: true,
        }}
      />
      <Stack.SearchBar
        placement="automatic"
        placeholder="Search Watch List"
        hideNavigationBar
        onChangeText={(e) => setSearchValue(e.nativeEvent.text)}
      />
      <Host
        style={{
          flex: 1,
        }}
      >
        <VStack
          spacing={8}
          alignment="center"
          modifiers={[padding({ horizontal: 8 })]}
        >
          <WatchListHeaderContext.Provider
            value={{
              isLandscape,
              windowWidth: width,
              anyItems,
              onClear: () => onClearHistory(stateChanged),
              onlyInProgress,
              setOnlyInProgress,
              sortMode,
              setSortMode,
            }}
          >
            <WatchListHeader />
          </WatchListHeaderContext.Provider>
          <VStack
            modifiers={[
              padding({ top: 16, bottom: 8, horizontal: 8 }),
              background(
                DynamicColorIOS({
                  dark: "#1a1a1a",
                  light: "#ffffff",
                }),
              ),
              cornerRadius(16),
            ]}
          >
            <HStack>
              <Text>Anime</Text>
              <Spacer />
              <Text>Episode</Text>
              <Text>Action</Text>
            </HStack>
            <Divider />
            <ScrollView>
              <LazyVStack spacing={8}>
                {anyItems ? (
                  <>
                    {filteredState
                      .sort(([a], [b]) =>
                        sortMode > 0 ? a.localeCompare(b) : b.localeCompare(a),
                      )
                      .map(([animeName, data]) => (
                        <HStack key={animeName}>
                          <Button
                            onPress={() => {
                              updateState(
                                data.latestVisitedUrl
                                  ? {
                                      url: data.latestVisitedUrl,
                                      reload: true,
                                    }
                                  : {},
                              );
                              router.navigate("/");
                            }}
                            modifiers={[
                              buttonStyle("borderless"),
                              tint(
                                data.latestVisitedUrl
                                  ? "rgb(0, 100, 255)"
                                  : DynamicColorIOS({
                                      dark: "white",
                                      light: "black",
                                    }),
                              ),
                              frame({
                                maxWidth: Infinity,
                                alignment: "leading",
                              }),
                            ]}
                          >
                            <Text
                              modifiers={[multilineTextAlignment("leading")]}
                            >
                              {animeName}
                            </Text>
                          </Button>
                          <Text
                            modifiers={
                              isAnimeFinished(data)
                                ? [foregroundStyle("green")]
                                : data.finished
                                  ? [foregroundStyle("orange")]
                                  : []
                            }
                            // style={isAnimeFinished(data) && styles.animeFinished}
                          >
                            {`${data.highestWatchedEpisode} / ${data.total ?? "?"}`}
                          </Text>
                          <Button
                            modifiers={[buttonStyle("glass")]}
                            onPress={() =>
                              onAnimeAction(data, router, stateChanged)
                            }
                            label="⛓️"
                          />
                        </HStack>
                      ))}
                  </>
                ) : (
                  <Text modifiers={[multilineTextAlignment("center")]}>
                    nothing to see here 👁️👄👁️
                  </Text>
                )}
              </LazyVStack>
            </ScrollView>
          </VStack>
          <Button
            modifiers={[buttonStyle("glassProminent"), tint("#0088ff88")]}
            onPress={() =>
              router.navigate({
                pathname: "/anime-modal",
                params: {},
              })
            }
            label="Add manually"
            systemImage="plus"
          />
        </VStack>
      </Host>
    </>
  );
}
