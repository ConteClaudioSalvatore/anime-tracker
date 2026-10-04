import { Alert } from "react-native";
import { AppStore } from "./app-store.util";

export function onClearHistory(callback: () => void) {
  Alert.alert(
    "Clear watch history",
    "Are you sure you want to clear your entire watch history?",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          await AppStore.Update((state) => ({ ...state, anime: {} })).then(
            callback,
          );
        },
      },
    ],
  );
}
