import { Platform, PlatformColor, type ColorValue } from "react-native";
import { useColorScheme } from "./use-color-scheme";

export function useProviderPalette(): Record<
  "bg" | "card" | "text" | "muted" | "border" | "accent" | "error",
  ColorValue
> {
  const dark = useColorScheme() === "dark";
  if (Platform.OS === "ios") {
    return {
      bg: PlatformColor("systemGroupedBackground"),
      card: PlatformColor("secondarySystemGroupedBackground"),
      text: PlatformColor("label"),
      muted: PlatformColor("secondaryLabel"),
      border: PlatformColor("separator"),
      accent: PlatformColor("systemBlue"),
      error: PlatformColor("systemRed"),
    };
  }
  return {
    bg: dark ? "#10151e" : "#f5f7fb",
    card: dark ? "#1d2633" : "#fff",
    text: dark ? "#eef3ff" : "#182437",
    muted: dark ? "#b5c0d0" : "#4c5b70",
    border: dark ? "#46546b" : "#cbd5e1",
    accent: "#2463dc",
    error: dark ? "#ffb6a8" : "#a72d17",
  };
}
