import { useAppTranslation } from "@/hooks/use-app-translation";
import { getAnimeActionContext, isAnimeFinished } from "@/utils";
import { watchListProgress } from "@/utils/watch-list";
import {
  Button,
  HStack,
  Label,
  Menu,
  ProgressView,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonStyle,
  contentShape,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  labelStyle,
  multilineTextAlignment,
  padding,
  progressViewStyle,
  shapes,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { PlatformColor } from "react-native";
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
  const progress = watchListProgress(anime);
  const completed = isAnimeFinished(anime);
  const status = completed
    ? t("watch.completed")
    : anime.finished
      ? t("watch.stopped")
      : undefined;
  const color = completed
    ? PlatformColor("systemGreenColor")
    : anime.finished
      ? PlatformColor("systemOrangeColor")
      : PlatformColor("systemBlueColor");
  const episode =
    progress === undefined
      ? t("watch.episodeOnly", { episode: anime.highestWatchedEpisode })
      : t("watch.episodeOf", {
          episode: anime.highestWatchedEpisode,
          total: anime.total!,
        });
  const { finishedText } = getAnimeActionContext(anime, t);

  return (
    <HStack
      spacing={12}
      alignment="top"
      modifiers={[padding({ horizontal: 16, vertical: 16 })]}
    >
      <Button
        onPress={onOpen}
        modifiers={[
          buttonStyle("plain"),
          frame({ maxWidth: Infinity, minHeight: 44, alignment: "leading" }),
          accessibilityLabel(
            [t("watch.openSeries", { name }), episode, status]
              .filter(Boolean)
              .join(", "),
          ),
        ]}
      >
        <VStack
          alignment="leading"
          spacing={8}
          modifiers={[
            frame({ maxWidth: Infinity, alignment: "leading" }),
            contentShape(shapes.rectangle()),
          ]}
        >
          <Text
            modifiers={[
              font({ textStyle: "headline" }),
              foregroundStyle({ type: "hierarchical", style: "primary" }),
              multilineTextAlignment("leading"),
              fixedSize({ horizontal: false, vertical: true }),
            ]}
          >
            {name}
          </Text>
          <Text
            modifiers={[
              font({ textStyle: "subheadline" }),
              foregroundStyle({ type: "hierarchical", style: "secondary" }),
            ]}
          >
            {episode}
          </Text>
          {status && (
            <Text
              modifiers={[
                font({ textStyle: "caption", weight: "semibold" }),
                foregroundStyle(color),
              ]}
            >
              {status}
            </Text>
          )}
          {progress !== undefined && (
            <ProgressView
              value={progress}
              modifiers={[progressViewStyle("linear"), tint(color)]}
            />
          )}
        </VStack>
      </Button>
      <Menu
        label={
          <Label
            title={t("watch.rowActions", { name })}
            systemImage="ellipsis"
            modifiers={[
              padding({ horizontal: 12, vertical: 12 }),
              frame({ minWidth: 44, minHeight: 44 }),
              contentShape(shapes.rectangle()),
            ]}
          />
        }
        modifiers={[buttonStyle("borderless"), labelStyle("iconOnly")]}
      >
        <Button
          label={t("common.edit")}
          systemImage="pencil"
          onPress={onEdit}
        />
        <Button
          label={finishedText}
          systemImage={
            anime.finished || completed ? "play" : "checkmark.circle"
          }
          onPress={onToggleFinished}
        />
        <Button
          label={t("common.remove")}
          systemImage="trash"
          role="destructive"
          onPress={onRemove}
        />
      </Menu>
    </HStack>
  );
}
