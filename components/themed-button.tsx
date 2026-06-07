import { useThemeColor } from "@/hooks/use-theme-color";
import { Button } from "@react-navigation/elements";
import react from "react";

export type ThemedButtonProps = Parameters<typeof Button>[0] & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedButton({
  darkColor,
  lightColor,
  ...props
}: ThemedButtonProps): react.JSX.Element {
  const color = useThemeColor({ dark: darkColor, light: lightColor }, "text");

  return <Button color={color} {...props} />;
}
