import { Anime } from "@/model";
import { toggleAnimeFinished } from "@/store/app.actions";
import {
  AppStore,
  getAnimeActionContext,
  onAnimeRemove,
  StoreContext,
} from "@/utils";
import { BottomSheet, Button, Column, Icon, Text } from "@expo/ui";
import { Button as AndroidButton } from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import { useRouter } from "expo-router";
import React from "react";

export default function WatchListAnimeActions(props: {
  anime: Anime;
  textColor: string;
  onClose: () => void;
}) {
  const { anime, textColor, onClose } = props;

  const { stateChanged } = React.useContext(StoreContext);
  const router = useRouter();
  const { finishedText, timeText } = getAnimeActionContext(anime);

  return (
    <BottomSheet isPresented onDismiss={onClose}>
      <Column alignment="center" spacing={4} modifiers={[fillMaxWidth()]}>
        <Text textStyle={{ color: textColor, fontWeight: "bold" }}>
          Actions
        </Text>
        <Text textStyle={{ color: textColor }}>
          {`Latest watched episode: ${anime.latestWatchedEpisode}`}
        </Text>
        <Text textStyle={{ color: textColor }}>{timeText}</Text>
        <Button
          variant="filled"
          onPress={() => {
            router.navigate({
              pathname: "/anime-modal",
              params: {
                animeName: anime.name,
                episode: anime.highestWatchedEpisode,
              },
            });
            onClose();
          }}
        >
          <Icon
            name={Icon.select({
              ios: "pencil",
              android: import("@expo/material-symbols/edit.xml"),
            })}
          />
          <Text>Edit</Text>
        </Button>
        {!(anime.latestWatchedEpisode === anime.total && anime.finished) && (
          <Button
            variant="filled"
            onPress={async () => {
              await AppStore.Dispatch(toggleAnimeFinished(anime.name)).then(
                stateChanged,
              );
              onClose();
            }}
          >
            <Text>{finishedText}</Text>
          </Button>
        )}
        <AndroidButton
          colors={{
            containerColor: "#dd2222",
            contentColor: "#ffffff",
          }}
          onClick={() => {
            onAnimeRemove(anime.name, stateChanged);
          }}
        >
          <Icon
            name={Icon.select({
              ios: "bin.xmark",
              android: import("@expo/material-symbols/delete.xml"),
            })}
          />
          <Text textStyle={{ color: "white" }}>Remove</Text>
        </AndroidButton>
        <Button variant="outlined" onPress={onClose}>
          <Text>Cancel</Text>
        </Button>
      </Column>
    </BottomSheet>
  );
}
