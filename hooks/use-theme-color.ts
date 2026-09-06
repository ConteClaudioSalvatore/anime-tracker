/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ColorSchemeName } from "react-native";

export function useThemeColor(
  props: { [k in ColorSchemeName]?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark,
) {
  const theme = useColorScheme() ?? "light";
  const realTheme = theme === 'unspecified' ? 'light' : theme;
  const colorFromProps = props[realTheme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[realTheme][colorName];
  }
}
