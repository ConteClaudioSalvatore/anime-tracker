import { Pressable, Text, StyleSheet } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type ActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  variant?: "primary" | "secondary" | "tertiary";
  accessibilityLabel?: string;
  expanded?: boolean;
};

export default function ActionButton({
  label,
  onPress,
  disabled = false,
  primary = false,
  variant = primary ? "primary" : "secondary",
  accessibilityLabel = label,
  expanded,
}: ActionButtonProps) {
  const dark = useColorScheme() === "dark";
  const prominent = variant === "primary";
  const tertiary = variant === "tertiary";
  const color = tertiary
    ? dark
      ? "#a9c7ff"
      : "#2456a8"
    : prominent || dark
      ? "#fff"
      : "#182437";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, expanded }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: prominent
            ? "#2463dc"
            : tertiary
              ? "transparent"
              : dark
                ? "#1d2633"
                : "#fff",
        },
        tertiary && styles.tertiary,
        disabled && styles.disabled,
      ]}
    >
      {expanded !== undefined && (
        <MaterialIcons
          name={expanded ? "expand-more" : "chevron-right"}
          size={18}
          color={color}
        />
      )}
      <Text
        style={{
          color,
          fontWeight: tertiary ? "400" : "600",
          fontSize: 14,
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    maxWidth: "100%",
    flexShrink: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#8a9bb8",
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  tertiary: { borderWidth: 0 },
  disabled: { opacity: 0.45 },
});
