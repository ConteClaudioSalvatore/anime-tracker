import { AppStore, StoreContext } from "@/utils";
import { Host, Spacer, VStack, Button, HStack } from "@expo/ui/swift-ui";
import {
  buttonStyle,
  controlSize,
  frame,
  padding,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import React from "react";
import { Alert, useWindowDimensions } from "react-native";

export default function SettingsScreen() {
  const { stateChanged } = React.useContext(StoreContext);
  const { width } = useWindowDimensions();

  const onRestore = () => {
    Alert.alert(
      "Restore BACKUP",
      "Are you sure to restore the previous backup? This will override your current data.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Proceed",
          style: "destructive",
          onPress: () => {
            AppStore.RestoreBackup().then(stateChanged);
          },
        },
      ],
    );
  };

  return (
    <Host
      style={{
        flex: 1,
      }}
    >
      <VStack
        modifiers={[
          frame({
            width,
          }),
          padding({
            vertical: 8,
          }),
        ]}
      >
        <Spacer />
        <HStack>
          <Button
            label="BACKUP"
            systemImage="square.and.arrow.up"
            modifiers={[
              buttonStyle("glassProminent"),
              tint("#00ff5588"),
              controlSize("large"),
            ]}
            onPress={() => AppStore.Backup()}
          />
          <Button
            modifiers={[
              buttonStyle("glassProminent"),
              tint("#88880088"),
              controlSize("large"),
            ]}
            systemImage="square.and.arrow.down"
            label="RESTORE BACKUP"
            onPress={onRestore}
          />
        </HStack>
      </VStack>
    </Host>
  );
}
