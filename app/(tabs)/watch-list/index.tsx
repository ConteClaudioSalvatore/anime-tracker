import WatchListHeader, {
  WatchListHeaderContext,
} from "@/components/watch-list/header";
import { AppStoreState } from "@/model";
import { removeAnime, toggleAnimeFinished } from "@/store/app.actions";
import { AppStore, Storage, StoreContext } from "@/utils";
import { AppStateContext } from "@/utils/app-state.util";

import {
  Button,
  Divider,
  Host,
  HStack,
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

  const isAnimeFinished = (anime: AppStoreState[string]): boolean => {
    const progress = anime.episodeProgress?.[anime.highestWatchedEpisode];
    const watchedFor90Percent =
      progress?.progress !== undefined &&
      progress.progress > progress.total * 0.9;
    return (
      anime.highestWatchedEpisode === (anime.total ?? -1) &&
      // if watched for more than 90% we consider the episode finished
      (anime.finished || watchedFor90Percent)
    );
  };

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

  const computeTimeStamp = (progress: number) => {
    if (typeof progress !== "number" || Number.isNaN(progress)) {
      throw new TypeError("Input must be a valid number.");
    }
    if (progress < 0) {
      throw new Error("Seconds cannot be negative.");
    }

    // Calculate hours, minutes, seconds
    const hours = Math.floor(progress / 3600);
    const minutes = Math.floor((progress % 3600) / 60);
    const seconds = Math.floor(progress % 60);

    // Pad with leading zeros
    const pad = (num: number) => String(num).padStart(2, "0");

    if (hours === 0) {
      return `${pad(minutes)}:${pad(seconds)}`;
    }

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const onClear = () =>
    Alert.alert(
      "Clear watch history",
      "Are you sure you want to clear your entire watch history?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes",
          style: "destructive",
          onPress: () => {
            Storage.removeItem("state").then(() => {
              stateChanged();
            });
          },
        },
      ],
    );

  const onSingleItemRemove = (animeName: string) => {
    Alert.alert(
      `Remove "${animeName}"`,
      "Are you sure you want to remove this anime from the list?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes",
          style: "destructive",
          onPress: () => {
            AppStore.Dispatch(removeAnime(animeName)).then(stateChanged);
          },
        },
      ],
    );
  };

  const toggleAnimeProgress = async (animeName: string) => {
    await AppStore.Dispatch(toggleAnimeFinished(animeName)).then(stateChanged);
  };

  const onItemActions = (
    data: AppStoreState["string"] & { animeName: string },
  ) => {
    let timeText = "";
    if (data.episodeProgress?.[data.latestWatchedEpisode]) {
      timeText = `\nTime: ${computeTimeStamp(data.episodeProgress?.[data.latestWatchedEpisode]?.progress ?? 0)}`;
      if (data.episodeProgress[data.latestWatchedEpisode].total)
        timeText = timeText.concat(
          ` / ${computeTimeStamp(data.episodeProgress[data.latestWatchedEpisode]?.total ?? 0)}`,
        );
    }
    let finishedText = "Drop Anime";
    if (data.latestWatchedEpisode === data.total)
      finishedText = "Mark as finished";
    if (data.finished) finishedText = "Resume Anime";
    Alert.alert(
      "Actions",
      `Latest watched episode: ${data.latestWatchedEpisode}`.concat(timeText),
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Edit",
          style: "default",
          onPress: () => {
            router.navigate({
              pathname: "/anime-modal",
              params: {
                animeName: data.animeName,
                episode: data.highestWatchedEpisode,
              },
            });
          },
        },
        ...(!(data.latestWatchedEpisode === data.total && data.finished)
          ? ([
              {
                text: finishedText,
                style: "default",
                onPress: () => {
                  toggleAnimeProgress(data.animeName);
                },
              },
            ] as AlertButton[])
          : []),
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            onSingleItemRemove(data.animeName);
          },
        },
      ],
    );
  };

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
              onClear,
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
              <VStack spacing={8}>
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
                              onItemActions({ ...data, animeName })
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
              </VStack>
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
