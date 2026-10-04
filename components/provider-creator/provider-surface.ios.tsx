import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { PlatformColor, StyleSheet, View, type ViewProps } from "react-native";

export default function ProviderSurface({ style, ...props }: ViewProps) {
  if (!isLiquidGlassAvailable()) {
    return <View {...props} style={[style, styles.fallback]} />;
  }
  return (
    <GlassView
      {...props}
      glassEffectStyle="regular"
      colorScheme="auto"
      style={[style, styles.glass]}
    />
  );
}

const styles = StyleSheet.create({
  glass: { borderRadius: 24, backgroundColor: "transparent" },
  fallback: {
    borderRadius: 24,
    backgroundColor: PlatformColor("secondarySystemGroupedBackground"),
  },
});
