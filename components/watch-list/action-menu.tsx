import { BottomSheet, Button, Column, Icon, Row, Text } from "@expo/ui";
import {
  DropdownMenu,
  DropdownMenuItem,
  Icon as ComposeIcon,
  IconButton,
  FilledIconButton,
} from "@expo/ui/jetpack-compose";
import { size } from "@expo/ui/jetpack-compose/modifiers";
import { useState } from "react";
import { Platform } from "react-native";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useThemeColor } from "@/hooks/use-theme-color";

interface ActionMenuProps {
  label: string;
  overCover?: boolean;
  actions: {
    label: string;
    onPress: () => void;
    destructive?: boolean;
    disabled?: boolean;
  }[];
}

export default function ActionMenu({
  label,
  actions,
  overCover = false,
}: ActionMenuProps) {
  const t = useAppTranslation();
  const textColor = useThemeColor({}, "text");
  const destructiveColor = useThemeColor(
    { light: "#b3261e", dark: "#ffb4ab" },
    "text",
  );
  const [expanded, setExpanded] = useState(false);
  const trigger = (
    <Button variant="text" onPress={() => setExpanded(true)}>
      <Row style={{ paddingVertical: 8, paddingHorizontal: 4 }}>
        <Icon
          name={Icon.select({
            ios: "ellipsis",
            android: import("@expo/material-symbols/more_horiz.xml"),
          })}
          size={20}
          accessibilityLabel={label}
        />
      </Row>
    </Button>
  );
  const select = (onPress: () => void) => {
    setExpanded(false);
    onPress();
  };

  if (Platform.OS === "android") {
    const TriggerButton = overCover ? FilledIconButton : IconButton;
    return (
      <DropdownMenu
        expanded={expanded}
        onDismissRequest={() => setExpanded(false)}
        modifiers={[size(48, 48)]}
      >
        <DropdownMenu.Trigger>
          <TriggerButton
            onClick={() => setExpanded(true)}
            modifiers={[size(48, 48)]}
            colors={
              overCover
                ? { containerColor: "#24242a", contentColor: "#ffffff" }
                : undefined
            }
          >
            <ComposeIcon
              source={require("@expo/material-symbols/more_horiz.xml")}
              size={24}
              tint={overCover ? "#ffffff" : textColor}
              contentDescription={label}
            />
          </TriggerButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.label}
              enabled={!action.disabled}
              onClick={() => select(action.onPress)}
              elementColors={
                action.destructive ? { textColor: destructiveColor } : undefined
              }
            >
              <DropdownMenuItem.Text>
                <Text>{action.label}</Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    );
  }

  return (
    <Row>
      {trigger}
      <BottomSheet isPresented={expanded} onDismiss={() => setExpanded(false)}>
        <Column spacing={8} style={{ padding: 16 }}>
          <Text textStyle={{ fontWeight: "bold" }}>{label}</Text>
          {actions.map((action) => (
            <Button
              key={action.label}
              disabled={action.disabled}
              variant="text"
              label={action.label}
              onPress={() => select(action.onPress)}
            />
          ))}
          <Button
            variant="outlined"
            label={t("common.cancel")}
            onPress={() => setExpanded(false)}
          />
        </Column>
      </BottomSheet>
    </Row>
  );
}
