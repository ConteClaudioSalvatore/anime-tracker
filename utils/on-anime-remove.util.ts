import { Alert } from "react-native";
import { AppStore } from "./app-store.util";
import { removeAnime } from "@/store/app.actions";

export function onAnimeRemove(animeName: string, callback: () => void): void {
  Alert.alert(
    `Remove "${animeName}"`,
    "Are you sure you want to remove this anime from the list?",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          await AppStore.Dispatch(removeAnime(animeName)).then(callback);
        },
      },
    ],
  );
}
