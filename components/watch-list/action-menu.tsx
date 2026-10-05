import { BottomSheet, Button, Column, Icon, Row, Text } from "@expo/ui";
import { DropdownMenu, DropdownMenuItem } from "@expo/ui/jetpack-compose";
import { useState } from "react";
import { Platform } from "react-native";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useThemeColor } from "@/hooks/use-theme-color";

interface ActionMenuProps {
  label: string;
  actions: { label: string; onPress: () => void; destructive?: boolean }[];
}

export default function ActionMenu({ label, actions }: ActionMenuProps) {
  const t = useAppTranslation();
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
    return (
      <DropdownMenu
        expanded={expanded}
        onDismissRequest={() => setExpanded(false)}
      >
        <DropdownMenu.Trigger>{trigger}</DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.label}
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
