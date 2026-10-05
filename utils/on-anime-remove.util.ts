import { translate as t } from "@/utils/i18n";
import { Alert } from "react-native";
import { AppStore } from "./app-store.util";
import { removeAnime } from "@/store/app.actions";

export function onAnimeRemove(animeName: string, callback: () => void): void {
  Alert.alert(
    t("watch.removeTitle", { name: animeName }),
    t("watch.removeConfirm"),
    [
      {
        text: t("common.cancel"),
        style: "cancel",
      },
      {
        text: t("common.yes"),
        style: "destructive",
        onPress: async () => {
          await AppStore.Dispatch(removeAnime(animeName)).then(callback);
        },
      },
    ],
  );
}
