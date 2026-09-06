import { StoreContext } from "@/utils";
import { restoreBackup, saveBackup } from "@/utils/backup.util";
import { Button, Column, Host, Icon, Row, Spacer, Text,  } from "@expo/ui";
import React from "react";

export default function SettingsScreen() {
  const { stateChanged } = React.useContext(StoreContext);

  return (
    <Host style={{ flex: 1 }}>
      <Column alignment="center">
        <Spacer flexible />
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
