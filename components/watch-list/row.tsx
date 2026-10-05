import { useAppTranslation } from "@/hooks/use-app-translation";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getAnimeActionContext, isAnimeFinished } from "@/utils";
import { watchListProgress } from "@/utils/watch-list";
import { Column, Row, Text } from "@expo/ui";
import { LinearProgressIndicator } from "@expo/ui/jetpack-compose";
import {
  fillMaxWidth,
  height,
  weight,
} from "@expo/ui/jetpack-compose/modifiers";
import { Platform } from "react-native";
import ActionMenu from "./action-menu";
import type { WatchListRowProps } from "./types";

export default function WatchListRow({
  name,
  anime,
  onOpen,
  onEdit,
  onToggleFinished,
  onRemove,
}: WatchListRowProps) {
  const t = useAppTranslation();
  const textColor = useThemeColor({}, "text");
  const secondaryColor = useThemeColor(
    { light: "#62626a", dark: "#b0b0b8" },
    "text",
  );
  const completedColor = useThemeColor(
    { light: "#23793e", dark: "#78d99a" },
    "text",
  );
  const stoppedColor = useThemeColor(
    { light: "#8d5200", dark: "#ffcc80" },
    "text",
  );
  const activeColor = useThemeColor(
    { light: "#256fc9", dark: "#7cb7ff" },
    "text",
  );
  const progress = watchListProgress(anime);
  const completed = isAnimeFinished(anime);
  const status = completed
    ? t("watch.completed")
    : anime.finished
      ? t("watch.stopped")
      : undefined;
  const color = completed
    ? completedColor
    : anime.finished
      ? stoppedColor
      : activeColor;
  const { finishedText } = getAnimeActionContext(anime, t);
  const episode =
    progress === undefined
      ? t("watch.episodeOnly", { episode: anime.highestWatchedEpisode })
      : t("watch.episodeOf", {
          episode: anime.highestWatchedEpisode,
          total: anime.total!,
        });

  return (
    <Row
      alignment="start"
      spacing={8}
      style={{ paddingRight: 8, width: "100%" }}
    >
      <Column
        spacing={8}
        onPress={onOpen}
        style={{ padding: 16 }}
        modifiers={[weight(1)]}
      >
        <Text textStyle={{ fontSize: 17, fontWeight: "600", color: textColor }}>
          {name}
        </Text>
        <Text textStyle={{ fontSize: 14, color: secondaryColor }}>
          {episode}
        </Text>
        {status && (
          <Text textStyle={{ fontSize: 13, fontWeight: "600", color }}>
            {status}
          </Text>
        )}
        {progress !== undefined && Platform.OS === "android" && (
          <LinearProgressIndicator
            progress={progress}
            color={color}
            modifiers={[fillMaxWidth(), height(4)]}
          />
        )}
      </Column>
      <Column style={{ paddingTop: 8 }}>
        <ActionMenu
          label={t("watch.rowActions", { name })}
          actions={[
            { label: t("common.edit"), onPress: onEdit },
            { label: finishedText, onPress: onToggleFinished },
            { label: t("common.remove"), onPress: onRemove, destructive: true },
          ]}
        />
      </Column>
    </Row>
  );
}
