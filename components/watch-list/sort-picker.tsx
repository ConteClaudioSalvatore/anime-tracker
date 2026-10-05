import { useAppTranslation } from "@/hooks/use-app-translation";
import {
  watchListSortOptions,
  type WatchListSortMode,
} from "@/utils/watch-list";
import { Picker } from "@expo/ui";
import {
  DropdownMenu,
  DropdownMenuItem,
  Icon,
  OutlinedButton,
  Text,
} from "@expo/ui/jetpack-compose";
import { fillMaxWidth, weight } from "@expo/ui/jetpack-compose/modifiers";
import { useState } from "react";
import { Platform } from "react-native";

export default function SortPicker({
  value,
  onChange,
}: {
  value: WatchListSortMode;
  onChange: (value: WatchListSortMode) => void;
}) {
  const t = useAppTranslation();
  const [expanded, setExpanded] = useState(false);
  if (Platform.OS !== "android")
    return (
      <Picker selectedValue={value} onValueChange={onChange}>
        {watchListSortOptions.map((option) => (
          <Picker.Item
            key={option.value}
            value={option.value}
            label={t(option.labelKey)}
          />
        ))}
      </Picker>
    );

  const selected = watchListSortOptions.find(
    (option) => option.value === value,
  )!;
  return (
    <DropdownMenu
      expanded={expanded}
      onDismissRequest={() => setExpanded(false)}
      modifiers={[weight(1)]}
    >
      <DropdownMenu.Trigger>
        <OutlinedButton
          onClick={() => setExpanded(true)}
          modifiers={[fillMaxWidth()]}
        >
          <Text maxLines={1} overflow="ellipsis" modifiers={[weight(1)]}>
            {t(selected.labelKey)}
          </Text>
          <Icon
            source={require("@expo/material-symbols/arrow_drop_down.xml")}
            size={24}
          />
        </OutlinedButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Items>
        {watchListSortOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => {
              setExpanded(false);
              onChange(option.value);
            }}
          >
            <DropdownMenuItem.Text>
              <Text>{t(option.labelKey)}</Text>
            </DropdownMenuItem.Text>
            {option.value === value && (
              <DropdownMenuItem.TrailingIcon>
                <Icon
                  source={require("@expo/material-symbols/check.xml")}
                  size={24}
                />
              </DropdownMenuItem.TrailingIcon>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenu.Items>
    </DropdownMenu>
  );
}
