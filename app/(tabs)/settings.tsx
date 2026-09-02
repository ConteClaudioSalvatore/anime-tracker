import { ThemedView } from "@/components/themed-view";
import { AppStore, StoreContext } from "@/utils";
import { Button, Host } from "@expo/ui";
import { buttonStyle, tint } from "@expo/ui/swift-ui/modifiers";
import React from "react";
import { Alert, Dimensions, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { stateChanged } = React.useContext(StoreContext);

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
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <Host matchContents>
          <Button
            variant="filled"
            label="BACKUP"
            modifiers={[buttonStyle("glassProminent"), tint("#00ff5588")]}
            onPress={() => AppStore.Backup()}
          />
        </Host>
        <Host matchContents style={{ width: Dimensions.get("window").width }}>
          <Button
            variant="outlined"
            modifiers={[buttonStyle("glassProminent"), tint("#88880088")]}
            label="RESTORE BACKUP"
            onPress={onRestore}
          />
        </Host>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingInline: 16,
    paddingBlock: 24,
    borderWidth: 1,
    borderCurve: "continuous",
    borderRadius: 32,
    gap: 16,
    alignItems: "center",
  },
});
