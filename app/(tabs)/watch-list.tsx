import { ThemedView } from "@/components/themed-view";
import { Storage, StoreContext } from "@/utils";
import { Button } from "@react-navigation/elements";
import React from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "../../components/themed-text";

export default function TabTwoScreen() {
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
  },
  tableHeader: {
    fontSize: 20,
    fontWeight: "bold",
  },
  animeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    width: "50%",
  },
});
