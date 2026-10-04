import { Platform, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 12, paddingVertical: 6 },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  title: { fontSize: 20, fontWeight: "700", flexShrink: 1 },
  progress: { flexDirection: "row", gap: 4 },
  dot: { height: 3, flex: 1, borderRadius: 3 },
  browser: { flex: 1, minHeight: 120 },
  toolbar: { flexDirection: "row", alignItems: "center", padding: 6, gap: 4 },
  panel: { flexShrink: 1 },
  iosSurface:
    Platform.OS === "ios"
      ? { marginHorizontal: 8, marginBottom: 6, borderRadius: 24 }
      : {},
  compactPanel: { maxHeight: "30%" },
  panelScroll: { flexGrow: 0, flexShrink: 1 },
  panelContent: { paddingHorizontal: 10, paddingVertical: 10, gap: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", columnGap: 10, rowGap: 12 },
  expandedTools: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingLeft: 12,
    paddingVertical: 6,
    gap: 14,
    alignItems: "flex-start",
  },
  footer: { paddingHorizontal: 10, paddingBottom: 8, gap: 6, flexShrink: 0 },
  navigation: { alignItems: "center" },
  spacer: { flexGrow: 1 },
  copy: { fontSize: 14, lineHeight: 19 },
  input: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    minHeight: 44,
    fontSize: 16,
  },
  example: { gap: 8, paddingVertical: 8 },
});
