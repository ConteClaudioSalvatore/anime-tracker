import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme.web";
import { Anime } from "@/model";
import { AppStore, StoreContext } from "@/utils";
import { Button } from "@react-navigation/elements";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TextInput } from "react-native";

function AddAnimeModal() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { stateChanged } = React.useContext(StoreContext);

  const [state, setState] = React.useState<Anime>({
    animeName: (params.animeName as string) ?? "",
    episode: +((params.episode as string | null) ?? "1"),
  });

  const onAnimeNameChange = (e: string) => {
    setState((prev) => ({ ...prev, animeName: e }));
  };

  const onEpisodeChange = (e: string) => {
    setState((prev) => ({ ...prev, episode: +e }));
  };

  const onUpdateState = () => {
    AppStore.Update((prev) => ({
      ...prev,
      [state.animeName]: {
        ...prev[state.animeName],
        latestWatchedEpisode: state.episode,
      },
    })).then(() => {
      stateChanged();
      router.back();
    });
  };

  return (
    <ThemedView style={styles.container}>
      <TextInput
        value={state.animeName}
        style={{
          ...styles.input,
          ...styles.name,
          ...(colorScheme === "light" ? styles.inputLight : styles.inputDark),
        }}
        onChangeText={onAnimeNameChange}
      ></TextInput>
      <TextInput
        value={state.episode.toString()}
        style={{
          ...styles.input,
          ...styles.episode,
          ...(colorScheme === "light" ? styles.inputLight : styles.inputDark),
        }}
        keyboardType="numeric"
        onChangeText={onEpisodeChange}
      ></TextInput>
      <Button
        variant={state.animeName.length === 0 ? "tinted" : "filled"}
        disabled={state.animeName.length === 0}
        onPress={onUpdateState}
      >
        {params.animeName ? "EDIT" : "ADD"}
      </Button>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  inputDark: {
    backgroundColor: "rgb(255,255,255, .6)",
  },
  inputLight: {
    backgroundColor: "rgb(0,0,0, .16)",
  },
  input: {
    padding: 8,
    height: 40,
    borderRadius: 16,
    borderCurve: "continuous",
    fontSize: 20,
    elevation: 1,
  },
  name: {},
  episode: {},
});

export default AddAnimeModal;
