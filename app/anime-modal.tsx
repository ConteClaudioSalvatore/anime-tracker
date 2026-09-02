import { TextBox } from "@/components/text-box";
import { ThemedView } from "@/components/themed-view";
import { AnimeModalPayload } from "@/model";
import { upsertAnime } from "@/store/app.actions";
import { AppStore, StoreContext } from "@/utils";
import { Button, Host, Text } from "@expo/ui";
import { buttonStyle } from "@expo/ui/swift-ui/modifiers";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";

function AddAnimeModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { stateChanged } = React.useContext(StoreContext);

  const [state, setState] = React.useState<AnimeModalPayload>({
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
    AppStore.Dispatch(upsertAnime(state.animeName, state.episode)).then(() => {
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
      <Host matchContents style={{ alignSelf: "center" }}>
        <Button
          variant={state.animeName.length === 0 ? "filled" : "text"}
          disabled={state.animeName.length === 0}
          modifiers={[buttonStyle("glassProminent")]}
          onPress={onUpdateState}
        >
          <Text>{params.animeName ? "EDIT" : "ADD"}</Text>
        </Button>
      </Host>
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
