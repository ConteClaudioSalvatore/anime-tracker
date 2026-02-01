import { TextBox } from "@/components/text-box";
import { ThemedView } from "@/components/themed-view";
import { Anime } from "@/model";
import { AppStore, StoreContext } from "@/utils";
import { Button } from "@react-navigation/elements";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";

function AddAnimeModal() {
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
      <TextBox
        value={state.animeName}
        style={styles.name}
        onChangeText={onAnimeNameChange}
      ></TextBox>
      <TextBox
        value={state.episode.toString()}
        style={styles.episode}
        keyboardType="numeric"
        onChangeText={onEpisodeChange}
      ></TextBox>
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
  name: {},
  episode: {},
});

export default AddAnimeModal;
