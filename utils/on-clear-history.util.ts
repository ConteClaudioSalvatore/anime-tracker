import { translate as t } from "@/utils/i18n";
import { Alert } from "react-native";
import { AppStore } from "./app-store.util";

export function onClearHistory(callback: () => void) {
  Alert.alert(t("watch.clearTitle"), t("watch.clearConfirm"), [
    {
      text: t("common.cancel"),
      style: "cancel",
    },
    {
      text: t("common.yes"),
      style: "destructive",
      onPress: async () => {
        await AppStore.Update((state) => ({ ...state, anime: {} })).then(
          callback,
        );
      },
    },
  ]);
}
