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
  onError: () => void;
}) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.container,
        // A SwiftUI background must provide a concrete Yoga size for hosted content.
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
        onError={onError}
        style={[
          styles.image,
          size && { width: size.width, height: size.height },
        ]}
      />
      <View style={[StyleSheet.absoluteFill, styles.shade]} />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden", backgroundColor: "#17171c" },
  image: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 },
  shade: {
    experimental_backgroundImage:
      "linear-gradient(90deg, rgba(23, 23, 28, 0.88) 0%, rgba(23, 23, 28, 0.84) 44%, rgba(23, 23, 28, 0.76) 58%, rgba(23, 23, 28, 0.60) 72%, rgba(23, 23, 28, 0.30) 86%, rgba(23, 23, 28, 0.12) 100%)",
  },
});
