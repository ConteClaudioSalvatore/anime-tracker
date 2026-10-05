import { translate, type Translator } from "@/utils/i18n";
import { Anime } from "@/model";
import { computeTimeStamp } from "./compute-time-stamp.util";
import { Alert } from "react-native";
import { ImperativeRouter } from "expo-router";
import { onAnimeRemove } from "./on-anime-remove.util";
import { AppStore } from "./app-store.util";
import { toggleAnimeFinished } from "@/store/app.actions";
import { isAnimeFinished } from "./is-anime-finieshed.util";

export function getAnimeActionContext(
  anime: Anime,
  t: Translator = translate,
): {
  finishedText: string;
  timeText: string;
} {
  let timeText = "";
  if (anime.episodeProgress?.[anime.latestWatchedEpisode]) {
    timeText = t("watch.time", {
      time: computeTimeStamp(
        anime.episodeProgress?.[anime.latestWatchedEpisode]?.progress ?? 0,
      ),
    });
    if (anime.episodeProgress[anime.latestWatchedEpisode].total)
      timeText = timeText.concat(
        ` / ${computeTimeStamp(anime.episodeProgress[anime.latestWatchedEpisode]?.total ?? 0)}`,
      );
  }
  let finishedText = t("watch.drop");
  if (anime.latestWatchedEpisode === anime.total)
    finishedText = t("watch.finish");
  if (anime.finished || isAnimeFinished(anime))
    finishedText = t("watch.resume");

  return { finishedText, timeText };
}

export function onAnimeAction(
  anime: Anime,
  router: ImperativeRouter,
  callback: () => void,
): void {
  const t = translate;
  const { finishedText, timeText } = getAnimeActionContext(anime, t);
  Alert.alert(
    t("common.actions"),
    t("watch.latestEpisode", { episode: anime.latestWatchedEpisode }).concat(
      timeText,
    ),
    [
      {
        text: t("common.cancel"),
        style: "cancel",
      },
      {
        text: t("common.edit"),
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
      {
        text: finishedText,
        style: "default",
        onPress: async () => {
          await AppStore.Dispatch(toggleAnimeFinished(anime.name)).then(
            callback,
          );
        },
      },
      {
        text: t("common.remove"),
        style: "destructive",
        onPress: () => onAnimeRemove(anime.name, callback),
      },
    ],
  );
}
