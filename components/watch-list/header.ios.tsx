import { useAppTranslation } from "@/hooks/use-app-translation";
import { watchListSortOptions } from "@/utils/watch-list";
import {
  Button,
  HStack,
  Label,
  Menu,
  Picker,
  Spacer,
  Text,
} from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  contentShape,
  controlSize,
  disabled,
  frame,
  labelStyle,
  shapes,
  tag,
  padding,
  tint,
  foregroundStyle,
  accessibilityValue,
} from "@expo/ui/swift-ui/modifiers";
import type { WatchListHeaderProps } from "./types";
import { PlatformColor } from "react-native";
import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function WatchListHeader({
  hasHistory,
  onClear,
  onAdd,
  onExport,
  exporting,
  sortMode,
  setSortMode,
}: WatchListHeaderProps) {
  const t = useAppTranslation();
  const isInline = NativeTabs.BottomAccessory.usePlacement() === "inline";
  const actionModifiers = [
    buttonStyle("bordered"),
    buttonBorderShape("circle"),
    controlSize(isInline ? "small" : "regular"),
    labelStyle("iconOnly"),
    tint("#000000aa"),
    foregroundStyle("white"),
  ];
  const actionLabelModifiers = [
    frame({ width: 24, height: 24 }),
    contentShape(shapes.rectangle()),
  ];
  const selectedSort = watchListSortOptions.find(
    (option) => option.value === sortMode,
  )!;

  return (
    <HStack spacing={isInline ? 4 : 8} modifiers={[padding({ all: 8 })]}>
      <Menu
        label={
          <Label
            title={t("watch.sortBy")}
            systemImage="arrow.up.arrow.down"
            modifiers={actionLabelModifiers}
          />
        }
        modifiers={[
          ...actionModifiers,
          accessibilityLabel(t("watch.sortBy")),
          accessibilityValue(t(selectedSort.labelKey)),
        ]}
      >
        <Picker
          label={t("watch.sortBy")}
          selection={sortMode}
          onSelectionChange={setSortMode}
          modifiers={[
            tint(PlatformColor("label")),
            foregroundStyle(PlatformColor("label")),
          ]}
        >
          {watchListSortOptions.map((option) => (
            <Text key={option.value} modifiers={[tag(option.value)]}>
              {t(option.labelKey)}
            </Text>
          ))}
        </Picker>
      </Menu>
      <Spacer />
      <Button onPress={onAdd} modifiers={actionModifiers}>
        <Label
          title={t("watch.addManually")}
          systemImage="plus"
          modifiers={actionLabelModifiers}
        />
      </Button>
      <Menu
        label={
          <Label
            title={t("watch.options")}
            systemImage="ellipsis"
            modifiers={actionLabelModifiers}
          />
        }
        modifiers={actionModifiers}
      >
        <Button
          label={exporting ? t("backup.exporting") : t("backup.exportList")}
          systemImage="square.and.arrow.up"
          modifiers={[
            disabled(exporting),
            tint(PlatformColor("label")),
            foregroundStyle(PlatformColor("label")),
          ]}
          onPress={onExport}
        />
        {hasHistory && (
          <Button
            label={t("watch.clearTitle")}
            systemImage="trash"
            role="destructive"
            modifiers={[
              tint(PlatformColor("systemRed")),
              foregroundStyle(PlatformColor("systemRed")),
            ]}
            onPress={onClear}
          />
        )}
      </Menu>
    </HStack>
  );
}
