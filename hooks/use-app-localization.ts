import React from "react";
import { AppState } from "react-native";
import { getLocales } from "expo-localization";
import { i18n, resolveLanguage } from "@/utils/i18n";

function refreshLanguage() {
  const language = resolveLanguage(getLocales());
  if (i18n.language !== language) void i18n.changeLanguage(language);
}

// Bundled resources initialize synchronously before the first screen renders.
refreshLanguage();

export function useAppLocalization() {
  React.useEffect(() => {
    refreshLanguage();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshLanguage();
    });
    return () => subscription.remove();
  }, []);
}
