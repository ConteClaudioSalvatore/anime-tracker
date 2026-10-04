import SettingsProviders from "@/components/settings/providers";
import { StoreContext } from "@/utils";
import {
  exportWatchList,
  restoreBackup,
  saveBackup,
} from "@/utils/backup.util";
import { Button, Column, Host, Icon, Row, Spacer, Text } from "@expo/ui";
import React from "react";
import { StatusBar } from "react-native";

export default function SettingsScreen() {
  const { stateChanged } = React.useContext(StoreContext);
  const [exporting, setExporting] = React.useState(false);

  async function exportSummary() {
    setExporting(true);
    try {
      await exportWatchList();
    } finally {
      setExporting(false);
    }
  }

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
        <SettingsProviders />
        <Button variant="text" disabled={exporting} onPress={exportSummary}>
          <Icon
            name={Icon.select({
              ios: "square.and.arrow.up",
              android: import("@expo/material-symbols/upload.xml"),
            })}
          />
          <Text>{exporting ? "Exporting…" : "Export watch list"}</Text>
        </Button>
        <Text>Series names, episode progress, and completion status only.</Text>
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
