import { ThemedView } from "@/components/themed-view";
import { AppStore, StoreContext } from "@/utils";
import { Button } from "@react-navigation/elements";
import React from "react";
import { Alert, StyleSheet } from "react-native";
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
        <Button
          variant="filled"
          color="green"
          onPress={() => AppStore.Backup()}
        >
          BACKUP
        </Button>
        <Button color="yellow" onPress={onRestore}>
          RESTORE BACKUP
        </Button>
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
  },
});
