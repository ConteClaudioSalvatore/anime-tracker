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
  VStack,
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
  pickerStyle,
  shapes,
  tag,
} from "@expo/ui/swift-ui/modifiers";
import type { WatchListHeaderProps } from "./types";

export default function WatchListHeader({
  hasHistory,
  onClear,
  onAdd,
  onExport,
  exporting,
  onlyInProgress,
  setOnlyInProgress,
  sortMode,
  setSortMode,
}: WatchListHeaderProps) {
  const t = useAppTranslation();
  const actionModifiers = [
    buttonStyle("glass"),
    buttonBorderShape("circle"),
    controlSize("regular"),
    labelStyle("iconOnly"),
    frame({ minWidth: 44, minHeight: 44 }),
  ];
  const actionLabelModifiers = [
    frame({ width: 20, height: 20 }),
    contentShape(shapes.rectangle()),
  ];
  const selectedSort = watchListSortOptions.find(
    (option) => option.value === sortMode,
  )!;

  return (
    <VStack spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
      <Picker
        label={t("watch.filter")}
        selection={onlyInProgress ? "watching" : "all"}
        onSelectionChange={(value) => setOnlyInProgress(value === "watching")}
        modifiers={[pickerStyle("segmented")]}
      >
        <Text modifiers={[tag("watching")]}>{t("watch.watching")}</Text>
        <Text modifiers={[tag("all")]}>{t("watch.all")}</Text>
      </Picker>
      <HStack spacing={12}>
        <Menu
          label={t(selectedSort.labelKey)}
          systemImage="arrow.up.arrow.down"
          modifiers={[accessibilityLabel(t("watch.sortBy"))]}
        >
          <Picker
            label={t("watch.sortBy")}
            selection={sortMode}
            onSelectionChange={setSortMode}
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
            modifiers={[disabled(exporting)]}
            onPress={onExport}
          />
          {hasHistory && (
            <Button
              label={t("watch.clearTitle")}
              systemImage="trash"
              role="destructive"
              onPress={onClear}
            />
          )}
        </Menu>
      </HStack>
    </VStack>
  );
}
