import { Alert } from "react-native";
import { AppStore } from "./app-store.util";

export function restoreBackup(callback: () => void): void {
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
        onPress: async () => {
          await AppStore.RestoreBackup().then(callback);
        },
      },
    ],
  );
}

export async function saveBackup(): Promise<void> {
  await AppStore.Backup();
}
