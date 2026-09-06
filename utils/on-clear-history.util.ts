import { Alert } from "react-native";
import { Storage } from "./storage.util";

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
        onPress: () => {
          Storage.removeItem("state").then(callback);
        },
      },
    ],
  );
}
