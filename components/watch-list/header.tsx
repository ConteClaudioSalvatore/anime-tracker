import { useAppTranslation } from "@/hooks/use-app-translation";
import { watchListSortOptions } from "@/utils/watch-list";
import { Button, Column, Icon, Picker, Row, Spacer, Text } from "@expo/ui";
import {
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
} from "@expo/ui/jetpack-compose";
import { fillMaxWidth, weight } from "@expo/ui/jetpack-compose/modifiers";
import { Platform } from "react-native";
import ActionMenu from "./action-menu";
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
  const filters = [
    { watching: true, label: t("watch.watching") },
    { watching: false, label: t("watch.all") },
  ];

  return (
    <Column spacing={12} style={{ width: "100%" }}>
      {Platform.OS === "android" ? (
        <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
          {filters.map((filter) => (
            <SegmentedButton
              key={filter.label}
              selected={onlyInProgress === filter.watching}
              onClick={() => setOnlyInProgress(filter.watching)}
              modifiers={[weight(1)]}
            >
              <SegmentedButton.Label>
                <Text>{filter.label}</Text>
              </SegmentedButton.Label>
            </SegmentedButton>
          ))}
        </SingleChoiceSegmentedButtonRow>
      ) : (
        <Row spacing={8}>
          {filters.map((filter) => (
            <Button
              key={filter.label}
              variant={
                onlyInProgress === filter.watching ? "filled" : "outlined"
              }
              label={filter.label}
              onPress={() => setOnlyInProgress(filter.watching)}
            />
          ))}
        </Row>
      )}
      <Row alignment="center" spacing={8}>
        <Picker selectedValue={sortMode} onValueChange={setSortMode}>
          {watchListSortOptions.map((option) => (
            <Picker.Item
              key={option.value}
              value={option.value}
              label={t(option.labelKey)}
            />
          ))}
        </Picker>
        <Spacer flexible />
        <Button variant="text" onPress={onAdd}>
          <Icon
            name={Icon.select({
              ios: "plus",
              android: import("@expo/material-symbols/add.xml"),
            })}
            accessibilityLabel={t("watch.addManually")}
          />
        </Button>
        <ActionMenu
          label={t("watch.options")}
          actions={[
            {
              label: exporting ? t("backup.exporting") : t("backup.exportList"),
              onPress: onExport,
              disabled: exporting,
            },
            ...(hasHistory
              ? [
                  {
                    label: t("watch.clearTitle"),
                    onPress: onClear,
                    destructive: true,
                  },
                ]
              : []),
          ]}
        />
      </Row>
    </Column>
  );
}
