import { Anime } from "@/model";
import React from "react";
import { Button, Modal, TextInput } from "react-native";

export function AddAnimeModal(
  props: Readonly<{
    onClose: (reason: "close" | "add", payload?: Anime) => void;
  }>,
) {
  const [state, setState] = React.useState<Anime>({
    animeName: "",
    episode: 0,
  });

  const onAnimeNameChange = (e: string) => {
    setState((prev) => ({ ...prev, animeName: e }));
  };

  const onEpisodeChange = (e: string) => {
    setState((prev) => ({ ...prev, episode: +e }));
  };

  const onAdd = () => props.onClose("add", state);

  return (
    <Modal onDismiss={() => props.onClose("close")}>
      <TextInput
        value={state.animeName}
        onChangeText={onAnimeNameChange}
      ></TextInput>
      <TextInput
        value={state.episode.toString()}
        keyboardType="numeric"
        onChangeText={onEpisodeChange}
      ></TextInput>
      <Button title="Add" onPress={onAdd} />
    </Modal>
  );
}
