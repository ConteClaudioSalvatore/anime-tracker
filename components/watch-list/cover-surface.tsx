import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Box, RNHostView } from "@expo/ui/jetpack-compose";
import {
  fillMaxWidth,
  matchParentSize,
} from "@expo/ui/jetpack-compose/modifiers";
import { useCoverImage } from "@/hooks/use-cover-image";
import { CoverImage } from "./cover-image";

export default function CoverSurface({
  url,
  children,
}: {
  url?: string;
  children: (visible: boolean) => ReactNode;
}) {
  const cover = useCoverImage(url);
  const image = cover.url ? (
    <CoverImage
      url={cover.url}
      visible={cover.visible}
      onLoad={cover.onLoad}
      onError={cover.onError}
    />
  ) : null;
  if (Platform.OS === "android")
    return (
      <Box modifiers={[fillMaxWidth()]}>
        {image && (
          <RNHostView modifiers={[matchParentSize()]}>{image}</RNHostView>
        )}
        {children(cover.visible)}
      </Box>
    );
  return (
    <View style={{ overflow: "hidden" }}>
      {image && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {image}
        </View>
      )}
      {children(cover.visible)}
    </View>
  );
}
