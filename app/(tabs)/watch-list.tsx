import { TextBox } from "@/components/text-box";
import { ThemedView } from "@/components/themed-view";
import { AppState } from "@/model";
import { AppStore, Storage, StoreContext } from "@/utils";
import { Button } from "@react-navigation/elements";
import { Link } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  AlertButton,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "../../components/themed-text";

export default function WatchListScreen() {
  const { state, stateChanged } = React.useContext(StoreContext);
  const [searchValue, setSearchValue] = React.useState("");
  const [onlyInProgress, setOnlyInProgress] = React.useState(false);
  const router = useRouter();

  const isAnimeFinished = (anime: AppState[string]): boolean => {
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
      Object.entries(state).filter(
        ([k, v]) =>
          k.toLowerCase().includes(searchValue.toLowerCase()) &&
          (onlyInProgress ? !isAnimeFinished(v) : true),
      ),
    [state, searchValue, onlyInProgress],
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
            AppStore.Update((prev) =>
              Object.fromEntries(
                Object.entries(prev).filter(([k]) => k !== animeName),
              ),
            ).then(stateChanged);
          },
        },
      ],
    );
  };

  const markAsFinished = async (animeName: string) => {
    await AppStore.Update((prev) => ({
      ...prev,
      [animeName]: { ...prev[animeName], finished: true },
    }));
  };

  const onItemActions = (data: AppState["string"] & { animeName: string }) => {
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
            <Button variant="tinted" color="red" onPress={onClear}>
              CLEAR
            </Button>
          )}
        </View>
        <TextBox
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder="🔍 Search..."
        ></TextBox>
        <View style={styles.inProgressFilter}>
          <ThemedText>Only in progress</ThemedText>
          <Switch
            value={onlyInProgress}
            onValueChange={setOnlyInProgress}
          ></Switch>
        </View>

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
          <ScrollView contentContainerStyle={{ gap: 8 }}>
            {anyItems ? (
              <>
                {filteredState
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([animeName, data]) => (
                    <View key={animeName} style={styles.anime}>
                      {data.latestVisitedUrl ? (
                        <Link
                          screen="index"
                          params={
                            data.latestVisitedUrl
                              ? {
                                  url: data.latestVisitedUrl,
                                  reload: true,
                                }
                              : {}
                          }
                          style={{ ...styles.animeTitle, ...styles.animeLink }}
                        >
                          <ThemedText style={{ ...styles.animeLink, flex: 1 }}>
                            {animeName}
                          </ThemedText>
                        </Link>
                      ) : (
                        <ThemedText style={styles.animeTitle}>
                          {animeName}
                        </ThemedText>
                      )}

                      <ThemedText
                        style={isAnimeFinished(data) && styles.animeFinished}
                      >
                        {`${data.highestWatchedEpisode} / ${data.total ?? "?"}`}
                      </ThemedText>
                      <View style={styles.animeAction}>
                        <Button
                          variant="tinted"
                          color="blue"
                          onPress={() => onItemActions({ ...data, animeName })}
                        >
                          ⛓️
                        </Button>
                      </View>
                    </View>
                  ))}
              </>
            ) : (
              <ThemedText style={{ textAlign: "center" }}>
                nothing to see here 👁️👄👁️
              </ThemedText>
            )}
          </ScrollView>
        </View>
        <Button variant="tinted" color="green" screen="anime-modal" params={{}}>
          ADD MANUALLY
        </Button>
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
