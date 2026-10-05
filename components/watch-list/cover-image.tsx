import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

export function CoverImage({
  url,
  size,
  visible,
  onLoad,
  onError,
}: {
  url: string;
  size?: { width: number; height: number };
  visible: boolean;
  onLoad: () => void;
  onError: (error?: string) => void;
}) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.container,
        // Native UI backgrounds need a concrete Yoga size for hosted content.
        size && { width: size.width, height: size.height, flex: 0 },
        { opacity: visible ? 1 : 0 },
      ]}
    >
      <Image
        source={{ uri: url }}
        cachePolicy="memory"
        contentFit="cover"
        contentPosition="center"
        recyclingKey={url}
        onLoad={onLoad}
        onError={(event) => onError(event.error)}
        style={[
          styles.image,
          size && { width: size.width * 0.58, height: size.height },
        ]}
      />
      <View style={[StyleSheet.absoluteFill, styles.shade]} />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden", backgroundColor: "#17171c" },
  image: { position: "absolute", top: 0, bottom: 0, right: 0, width: "58%" },
  shade: {
    experimental_backgroundImage:
      "linear-gradient(90deg, #17171c 0%, #17171c 42%, rgba(23, 23, 28, 0.85) 48%, rgba(23, 23, 28, 0.60) 54%, rgba(23, 23, 28, 0.30) 62%, rgba(23, 23, 28, 0.12) 78%, rgba(23, 23, 28, 0.12) 100%)",
  },
});
