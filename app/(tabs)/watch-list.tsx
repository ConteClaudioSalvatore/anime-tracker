import { ThemedView } from "@/components/themed-view";
import { AppStore, Storage, StoreContext } from "@/utils";
import { Button } from "@react-navigation/elements";
import React from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "../../components/themed-text";

export default function WatchListScreen() {
  const { state, stateChanged } = React.useContext(StoreContext);

  const anyItems = React.useMemo(() => Object.keys(state).length > 0, [state]);

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

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>Watched</ThemedText>
        {anyItems && (
          <Button variant="tinted" color="red" onPress={onClear}>
            CLEAR
          </Button>
        )}
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
                {Object.entries(state).map(([animeName, data]) => (
                  <View key={animeName} style={styles.anime}>
                    <ThemedText style={styles.animeTitle}>
                      {animeName}
                    </ThemedText>
                    <ThemedText>
                      {`${data.latestWatchedEpisode} / ${data.total ?? "?"}`}
                    </ThemedText>
                    <View style={styles.animeAction}>
                      <Button
                        variant="tinted"
                        color="blue"
                        screen="anime-modal"
                        params={{
                          animeName,
                          episode: data.latestWatchedEpisode,
                        }}
                      >
                        🖋️
                      </Button>
                      <Button
                        variant="tinted"
                        color="red"
                        onPress={() => onSingleItemRemove(animeName)}
                      >
                        🗑️
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
  },
  animeAction: {
    width: 70,
    gap: 8,
  },
});
