import { useThemeColor } from "@/hooks/use-theme-color";
import { StoreContext } from "@/utils";
import { restoreBackup, saveBackup } from "@/utils/backup.util";
import { Button, Column, Host, Icon, Row, Spacer, Text } from "@expo/ui";
import { HorizontalDivider } from "@expo/ui/jetpack-compose";
import { fillMaxWidth, weight } from "@expo/ui/jetpack-compose/modifiers";
import { Divider } from "@expo/ui/swift-ui";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, StatusBar } from "react-native";

export default function SettingsScreen() {
  const { stateChanged } = React.useContext(StoreContext);
  const router = useRouter();
  const textColor = useThemeColor(
    {
      dark: "white",
      light: "black",
    },
    "text",
  );
  const listBackgroundColor = useThemeColor(
    { dark: "#1a1a1a", light: "#ffffff" },
    "background",
  );

  return (
    <Host
      style={{
        position: "absolute",
        top: StatusBar.currentHeight,
        bottom: 0,
        insetInline: 0,
      }}
    >
      <Column alignment="center" style={{ padding: 8 }}>
        <Column
          alignment="center"
          style={{
            padding: 8,
            backgroundColor: listBackgroundColor,
            borderRadius: 32,
          }}
          spacing={8}
          modifiers={[weight(1), fillMaxWidth()]}
        >
          <Text
            textStyle={{ color: textColor, fontWeight: "bold", fontSize: 18 }}
          >
            Select Default Provider
          </Text>
          {Platform.OS === "android" && <HorizontalDivider />}
          {Platform.OS === "ios" && <Divider />}
          <Column alignment="center">
            <Text textStyle={{ color: textColor }}>No Providers found</Text>
            <Spacer flexible />
            <Button
              onPress={() => {
                router.navigate("/provider-creator");
              }}
            >
              <Icon
                name={Icon.select({
                  ios: "plus",
                  android: import("@expo/material-symbols/add.xml"),
                })}
              />
              <Text>Add Provider</Text>
            </Button>
          </Column>
        </Column>
        <Spacer />
        <Row alignment="center" style={{ padding: 8 }} spacing={8}>
          <Button
            variant="filled"
            style={{ borderColor: "#00ff5588" }}
            onPress={saveBackup}
          >
            <Icon
              name={Icon.select({
                ios: "square.and.arrow.up",
                android: import("@expo/material-symbols/upload.xml"),
              })}
            />

            <Text>BACKUP</Text>
          </Button>
          <Button
            variant="outlined"
            style={{ borderColor: "#88880088" }}
            onPress={() => restoreBackup(stateChanged)}
          >
            <Icon
              name={Icon.select({
                ios: "square.and.arrow.down",
                android: import("@expo/material-symbols/download.xml"),
              })}
            />
            <Text>RESTORE BACKUP</Text>
          </Button>
        </Row>
      </Column>
    </Host>
  );
}
