import { TextBox } from "@/components/text-box";
import { ThemedView } from "@/components/themed-view";
import { AppStoreState } from "@/model";
import { markAnimeFinished, removeAnime } from "@/store/app.actions";
import { AppStore, Storage, StoreContext } from "@/utils";
import { AppStateContext } from "@/utils/app-state.util";
import { Button, Host, Text } from "@expo/ui";
import {
  HStack,
  Menu,
  Overlay,
  Picker,
  ScrollView,
  Toggle,
  VStack,
} from "@expo/ui/swift-ui";
import {
  background,
  buttonStyle,
  clipShape,
  font,
  foregroundStyle,
  frame,
  labelStyle,
  multilineTextAlignment,
  offset,
  pickerStyle,
  tag,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { useRouter } from "expo-router";
import { SFSymbol } from "expo-symbols";
import React from "react";
import {
  Alert,
  AlertButton,
  Dimensions,
  DynamicColorIOS,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "../../components/themed-text";

export default function WatchListScreen() {
  const { state: storeState, stateChanged } = React.useContext(StoreContext);
  const { updateState } = React.useContext(AppStateContext);
  const [searchValue, setSearchValue] = React.useState("");
  const [onlyInProgress, setOnlyInProgress] = React.useState(true);
  const [sortMode, setSortMode] = React.useState<1 | -1>(1);
  const router = useRouter();

  const isAnimeFinished = (anime: AppStoreState[string]): boolean => {
    const progress = anime.episodeProgress?.[anime.highestWatchedEpisode];
    return (
      (anime.highestWatchedEpisode === (anime.total ?? -1) &&
        // if watched for more than 90% we consider the episode finished
        (progress?.progress ?? 0) > (progress?.total ?? 0) * 0.9) ||
      (anime.finished ?? false)
    );
  };

  const filteredState = React.useMemo(
    () =>
      Object.entries(storeState).filter(
        ([k, v]) =>
          k.toLowerCase().includes(searchValue.toLowerCase()) &&
          (onlyInProgress ? !isAnimeFinished(v) : true),
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
      "Clear Watched",
      "Are you sure you want to clear your watched list?",
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

  const markAsFinished = async (animeName: string) => {
    await AppStore.Dispatch(markAnimeFinished(animeName)).then(stateChanged);
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
    Alert.alert(
      "Actions",
      `Latest watched episode: ${data.latestWatchedEpisode}`.concat(timeText),
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        ...(data.latestWatchedEpisode === data.total
          ? ([
              {
                text: "Mark as finished",
                style: "default",
                onPress: () => {
                  markAsFinished(data.animeName);
                },
              },
            ] as AlertButton[])
          : []),
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
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Watched</ThemedText>
          {anyItems && (
            <Host matchContents>
              <Button
                variant="outlined"
                modifiers={[tint("#ff000044"), buttonStyle("glassProminent")]}
                onPress={onClear}
              >
                <Text textStyle={{ color: "white" }}>CLEAR</Text>
              </Button>
            </Host>
          )}
        </View>
        <TextBox
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder="🔍 Search..."
        ></TextBox>
        <Host matchContents style={{ alignSelf: "flex-end" }}>
          <HStack modifiers={[frame({ alignment: "trailing" })]}>
            <Overlay alignment="topTrailing">
              <Menu
                label={"Settings"}
                modifiers={[labelStyle("titleAndIcon")]}
                systemImage={"slider.horizontal.3" satisfies SFSymbol}
              >
                <Picker
                  selection={sortMode}
                  onSelectionChange={setSortMode}
                  modifiers={[pickerStyle("menu")]}
                  label="Sort By"
                >
                  {[1, -1].map((sort) => (
                    <Text key={sort} modifiers={[tag(sort)]}>
                      {sort > 0 ? "A-Z" : "Z-A"}
                    </Text>
                  ))}
                </Picker>
                <Toggle
                  isOn={onlyInProgress}
                  onIsOnChange={setOnlyInProgress}
                  label="Only show in progress"
                />
              </Menu>
              <Overlay.Content>
                {onlyInProgress && (
                  <Text
                    modifiers={[
                      font({ size: 11, weight: "bold" }),
                      foregroundStyle("#FFFFFF"),
                      frame({ width: 18, height: 18 }),
                      background("#00aaff"),
                      clipShape("circle"),
                      offset({ x: 8, y: -8 }),
                    ]}
                  >
                    1
                  </Text>
                )}
              </Overlay.Content>
            </Overlay>
          </HStack>
        </Host>

        <View style={styles.animeList}>
          <View style={styles.anime}>
            <ThemedText
              style={StyleSheet.compose(styles.animeTitle, styles.tableHeader)}
            >
              Anime
            </ThemedText>
            <ThemedText style={styles.tableHeader}>Episode</ThemedText>
            <ThemedText
              style={StyleSheet.compose(styles.tableHeader, styles.animeAction)}
            >
              Action
            </ThemedText>
          </View>
          <Host style={{ flex: 1 }}>
            <ScrollView>
              <VStack>
                {anyItems ? (
                  <>
                    {filteredState
                      .sort(([a], [b]) =>
                        sortMode > 0 ? a.localeCompare(b) : b.localeCompare(b),
                      )
                      .map(([animeName, data]) => (
                        <HStack
                          key={animeName}
                          modifiers={[
                            frame({
                              width: Dimensions.get("window").width - 52,
                            }),
                          ]}
                        >
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
                                : []
                            }
                            // style={isAnimeFinished(data) && styles.animeFinished}
                          >
                            {`${data.highestWatchedEpisode} / ${data.total ?? "?"}`}
                          </Text>
                          <Button
                            variant="outlined"
                            modifiers={[buttonStyle("glass")]}
                            onPress={() =>
                              onItemActions({ ...data, animeName })
                            }
                          >
                            <Text>⛓️</Text>
                          </Button>
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
          </Host>
        </View>
        <Host matchContents style={{ alignSelf: "center" }}>
          <Button
            variant="filled"
            modifiers={[buttonStyle("glassProminent"), tint("#0088ff88")]}
            onPress={() =>
              router.navigate({
                pathname: "/anime-modal",
                params: {},
              })
            }
          >
            <Text>ADD MANUALLY</Text>
          </Button>
        </Host>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingInline: 16,
    paddingBlock: 24,
    borderWidth: 1,
    borderCurve: "continuous",
    borderRadius: 32,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    gap: 24,
    alignItems: "center",
    justifyContent: "space-between",
  },
  searchBox: {},
  inProgressFilter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    paddingInline: 8,
  },
  animeList: {
    gap: 8,
    borderWidth: 1,
    borderColor: "rgb(255,255,255,.16)",
    borderRadius: 16,
    padding: 8,
    borderCurve: "continuous",
    flex: 1,
  },
  anime: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  tableHeader: {
    fontSize: 20,
    fontWeight: "bold",
  },
  animeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    display: "flex",
  },
  animeLink: {
    color: "rgb(0, 100, 255)",
  },
  animeAction: {
    width: 70,
    gap: 8,
  },
  animeFinished: {
    color: "green",
  },
});
