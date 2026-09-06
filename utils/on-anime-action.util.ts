import { Anime } from "@/model";
import { computeTimeStamp } from "./compute-time-stamp.util";
import { Alert, AlertButton } from "react-native";
import { ImperativeRouter } from "expo-router";
import { onAnimeRemove } from "./on-anime-remove.util";
import { AppStore } from "./app-store.util";
import { toggleAnimeFinished } from "@/store/app.actions";

export function getAnimeActionContext(anime: Anime): {
  finishedText: string;
  timeText: string;
} {
  let timeText = "";
  if (anime.episodeProgress?.[anime.latestWatchedEpisode]) {
    timeText = `\nTime: ${computeTimeStamp(anime.episodeProgress?.[anime.latestWatchedEpisode]?.progress ?? 0)}`;
    if (anime.episodeProgress[anime.latestWatchedEpisode].total)
      timeText = timeText.concat(
        ` / ${computeTimeStamp(anime.episodeProgress[anime.latestWatchedEpisode]?.total ?? 0)}`,
      );
  }
  let finishedText = "Drop Anime";
  if (anime.latestWatchedEpisode === anime.total)
    finishedText = "Mark as finished";
  if (anime.finished) finishedText = "Resume Anime";

  return { finishedText, timeText };
}

export function onAnimeAction(
  anime: Anime,
  router: ImperativeRouter,
  callback: () => void,
): void {
  const { finishedText, timeText } = getAnimeActionContext(anime);
  Alert.alert(
    "Actions",
    `Latest watched episode: ${anime.latestWatchedEpisode}`.concat(timeText),
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Edit",
        style: "default",
        onPress: () => {
          router.navigate({
            pathname: "/anime-modal",
            params: {
              animeName: anime.name,
              episode: anime.highestWatchedEpisode,
            },
          });
        },
      },
      ...(!(anime.latestWatchedEpisode === anime.total && anime.finished)
        ? ([
            {
              text: finishedText,
              style: "default",
              onPress: async () => {
                await AppStore.Dispatch(toggleAnimeFinished(anime.name)).then(
                  callback,
                );
              },
            },
          ] as AlertButton[])
        : []),
      {
        text: "Remove",
        style: "destructive",
        onPress: () => onAnimeRemove(anime.name, callback),
      },
    ],
  );
}
