import CoverSurface from "./cover-surface";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getAnimeActionContext, isAnimeFinished } from "@/utils";
import { watchListProgress } from "@/utils/watch-list";
import { Column, Row, Text } from "@expo/ui";
import { Host } from "@expo/ui/jetpack-compose";
import { fillMaxWidth, weight } from "@expo/ui/jetpack-compose/modifiers";
import { Platform, Pressable, Text as RNText, View } from "react-native";
import ActionMenu from "./action-menu";
import type { WatchListRowProps } from "./types";

export default function WatchListRow({
  name,
  providerName,
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
    <CoverSurface url={anime.coverUrl}>
      {(covered) => {
        const menu = (
          <ActionMenu
            label={t("watch.rowActions", { name })}
            overCover={covered}
            actions={[
              { label: t("common.edit"), onPress: onEdit },
              { label: finishedText, onPress: onToggleFinished },
              {
                label: t("common.remove"),
                onPress: onRemove,
                destructive: true,
              },
            ]}
          />
        );
        if (Platform.OS === "android") {
          const progressColor = covered
            ? completed
              ? "#78d99a"
              : anime.finished
                ? "#ffcc80"
                : "#7cb7ff"
            : color;
          return (
            <View
              style={{
                width: "100%",
                minHeight: 64,
              }}
            >
              <Pressable
                accessibilityRole="button"
                onPress={onOpen}
                style={{ width: "100%", padding: 16, paddingRight: 72, gap: 8 }}
              >
                <RNText
                  style={{
                    fontSize: 17,
                    fontWeight: "600",
                    color: covered ? "#fff" : textColor,
                  }}
                >
                  {name}
                </RNText>
                <RNText
                  style={{
                    fontSize: 14,
                    color: covered ? "#d9d9df" : secondaryColor,
                  }}
                >
                  {episode}
                </RNText>
                {providerName && (
                  <RNText
                    style={{
                      fontSize: 13,
                      color: covered ? "#d9d9df" : secondaryColor,
                    }}
                  >
                    {t("watch.providerName", { name: providerName })}
                  </RNText>
                )}
                {status && (
                  <RNText
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: covered
                        ? completed
                          ? "#78d99a"
                          : "#ffcc80"
                        : color,
                    }}
                  >
                    {status}
                  </RNText>
                )}
                {progress !== undefined && (
                  <View
                    accessibilityRole="progressbar"
                    accessibilityValue={{
                      min: 0,
                      max: 100,
                      now: Math.round(progress * 100),
                    }}
                    style={{
                      height: 4,
                      borderRadius: 2,
                      overflow: "hidden",
                      backgroundColor: covered ? "#ffffff30" : "#80808030",
                    }}
                  >
                    <View
                      style={{
                        width: `${progress * 100}%`,
                        height: "100%",
                        backgroundColor: progressColor,
                      }}
                    />
                  </View>
                )}
              </Pressable>
              <Host
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 48,
                  height: 48,
                }}
              >
                {menu}
              </Host>
            </View>
          );
        }
        return (
          <Row
            alignment="start"
            spacing={8}
            style={{
              paddingRight: 8,
              width: "100%",
            }}
            modifiers={[fillMaxWidth()]}
          >
            <Column
              spacing={8}
              onPress={onOpen}
              style={{ padding: 16 }}
              modifiers={[weight(1)]}
            >
              <Text
                textStyle={{
                  fontSize: 17,
                  fontWeight: "600",
                  color: covered ? "#ffffff" : textColor,
                }}
              >
                {name}
              </Text>
              <Text
                textStyle={{
                  fontSize: 14,
                  color: covered ? "#d9d9df" : secondaryColor,
                }}
              >
                {episode}
              </Text>
              {providerName && (
                <Text
                  textStyle={{
                    fontSize: 13,
                    color: covered ? "#d9d9df" : secondaryColor,
                  }}
                >
                  {t("watch.providerName", { name: providerName })}
                </Text>
              )}
              {status && (
                <Text
                  textStyle={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: covered
                      ? completed
                        ? "#78d99a"
                        : "#ffcc80"
                      : color,
                  }}
                >
                  {status}
                </Text>
              )}
            </Column>
            <Column style={{ paddingTop: 8 }}>{menu}</Column>
          </Row>
        );
      }}
    </CoverSurface>
  );
}
