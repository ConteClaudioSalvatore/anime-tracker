import { ThemedView } from "@/components/themed-view";
import { StoreContext } from "@/utils";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "../../components/themed-text";

export default function TabTwoScreen() {
  const { state } = React.useContext(StoreContext);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>Watched</ThemedText>
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
            {Object.entries(state).map(([animeName, data]) => (
              <View key={animeName} style={styles.anime}>
                <ThemedText style={styles.animeTitle}>{animeName}</ThemedText>
                <ThemedText>
                  {`${Math.max(...data.watched.map((x) => +x))} / ${data.total ?? "?"}`}
                </ThemedText>
              </View>
            ))}
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
