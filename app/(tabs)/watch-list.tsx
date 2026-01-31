import { ThemedView } from "@/components/themed-view";
import { AppState } from "@/model";
import { AppStore } from "@/utils";
import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "../../components/themed-text";

export default function TabTwoScreen() {
  const [state, setState] = React.useState<AppState>({});

  React.useEffect(() => {
    AppStore.Get().then(setState);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView>
        <ThemedText>Watched</ThemedText>
        <View style={styles.animeList}>
          {Object.entries(state).map(([animeName, data]) => (
            <View key={animeName} style={styles.anime}>
              <ThemedText style={styles.animeTitle}>{animeName}</ThemedText>
              <ThemedText>
                {Math.max(...data.watched.map((x) => +x))}
              </ThemedText>
            </View>
          ))}
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: Dimensions.get("window").height,
    width: Dimensions.get("window").width,
    padding: 16,
  },
  animeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    width: "50%",
  },
  animeList: {
    gap: 8,
  },
  anime: {
    flexDirection: "row",
  },
});
