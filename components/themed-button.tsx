import { useThemeColor } from "@/hooks/use-theme-color";
import { Button, Host, Text } from "@expo/ui";
import react from "react";

export type ThemedButtonProps = Parameters<typeof Button>[0] & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedButton({
  darkColor,
  lightColor,
  children,
  ...props
}: ThemedButtonProps): react.JSX.Element {
  const color = useThemeColor({ dark: darkColor, light: lightColor }, "text");

  return (
    <Host matchContents>
      <Button variant="outlined" {...props}>
        {typeof children === "string" ? (
          <Text
            style={{
              borderColor: color,
            }}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </Button>
    </Host>
  );
}
