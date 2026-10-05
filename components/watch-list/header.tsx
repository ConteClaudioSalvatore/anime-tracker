import { useAppTranslation } from "@/hooks/use-app-translation";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Button, Column, Icon, Row, Spacer, Text } from "@expo/ui";
import {
  Icon as ComposeIcon,
  IconButton,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
} from "@expo/ui/jetpack-compose";
import { fillMaxWidth, size, weight } from "@expo/ui/jetpack-compose/modifiers";
import { Platform } from "react-native";
import ActionMenu from "./action-menu";
import SortPicker from "./sort-picker";
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
  const textColor = useThemeColor({}, "text");
  const filters = [
    { watching: true, label: t("watch.watching") },
    { watching: false, label: t("watch.all") },
  ];

  return (
    <Column
      spacing={12}
      style={{ width: Platform.OS === "android" ? undefined : "100%" }}
      modifiers={[fillMaxWidth()]}
    >
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
      <Row alignment="center" spacing={8} modifiers={[fillMaxWidth()]}>
        <SortPicker value={sortMode} onChange={setSortMode} />
        {Platform.OS !== "android" && <Spacer flexible />}
        {Platform.OS === "android" ? (
          <IconButton
            onClick={onAdd}
            colors={{ contentColor: textColor }}
            modifiers={[size(48, 48)]}
          >
            <ComposeIcon
              source={require("@expo/material-symbols/add.xml")}
              size={24}
              tint={textColor}
              contentDescription={t("watch.addManually")}
            />
          </IconButton>
        ) : (
          <Button variant="text" onPress={onAdd}>
            <Icon
              name={Icon.select({
                ios: "plus",
                android: import("@expo/material-symbols/add.xml"),
              })}
              accessibilityLabel={t("watch.addManually")}
            />
          </Button>
        )}
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
