import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useProviderPalette } from "@/hooks/use-provider-palette";
import { Pressable, StyleSheet, Text } from "react-native";
import type { ComponentProps } from "react";

type Props = {
  label: string;
  icon: ComponentProps<typeof MaterialIcons>["name"];
  onPress: () => void;
  accessibilityLabel?: string;
  destructive?: boolean;
  primary?: boolean;
};

export default function SettingsActionButton({
  label,
  icon,
  onPress,
  accessibilityLabel = label,
  destructive = false,
  primary = false,
}: Props) {
  const colors = useProviderPalette();
  const color = primary ? "#fff" : destructive ? colors.error : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? colors.accent : "transparent",
          borderColor: primary ? colors.accent : colors.border,
          opacity: pressed ? 0.65 : 1,
        },
      ]}
    >
      <MaterialIcons name={icon} size={18} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flexShrink: 1,
  },
  label: { fontSize: 14, fontWeight: "600", flexShrink: 1 },
});
