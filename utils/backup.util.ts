import { translate as t } from "@/utils/i18n";
import { Alert } from "react-native";
import { AppStore } from "./app-store.util";

export function restoreBackup(callback: () => void): void {
  Alert.alert(t("backup.restoreTitle"), t("backup.restoreConfirm"), [
    {
      text: t("common.cancel"),
      style: "cancel",
    },
    {
      text: t("backup.proceed"),
      style: "destructive",
      onPress: async () => {
        await AppStore.RestoreBackup().then(callback);
      },
    },
  ]);
}

export async function saveBackup(): Promise<void> {
  await AppStore.Backup();
}

export async function exportWatchList(): Promise<void> {
  try {
    await AppStore.ExportWatchList();
  } catch {
    Alert.alert(t("backup.exportFailed"), t("backup.exportFailedHelp"));
  }
}
