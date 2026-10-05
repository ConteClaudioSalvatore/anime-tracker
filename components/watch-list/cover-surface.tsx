import { useState, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Box, RNHostView } from "@expo/ui/jetpack-compose";
import {
  fillMaxWidth,
  onSizeChanged,
} from "@expo/ui/jetpack-compose/modifiers";
import { useCoverImage } from "@/hooks/use-cover-image";
import { CoverImage } from "./cover-image";

export default function CoverSurface({
  url,
  children,
}: {
  url?: string;
  children: (
    visible: boolean,
    details: {
      status: ReturnType<typeof useCoverImage>["status"];
      error?: string;
      size: { width: number; height: number };
    },
  ) => ReactNode;
}) {
  const cover = useCoverImage(url);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [containerWidth, setContainerWidth] = useState(0);
  const image = cover.url ? (
    <CoverImage
      size={Platform.OS === "android" ? size : undefined}
      url={cover.url}
      visible={cover.visible}
      onLoad={cover.onLoad}
      onError={cover.onError}
    />
  ) : null;
  const surface = (
    <View
      collapsable={false}
      style={{
        width:
          Platform.OS === "android" && containerWidth > 0
            ? containerWidth
            : "100%",
        overflow: "hidden",
      }}
      onLayout={({ nativeEvent: { layout } }) =>
        setSize((previous) =>
          previous.width === layout.width && previous.height === layout.height
            ? previous
            : { width: layout.width, height: layout.height },
        )
      }
    >
      {image &&
        (Platform.OS !== "android" || (size.width > 0 && size.height > 0)) && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {image}
          </View>
        )}
      {children(cover.visible, {
        status: cover.status,
        error: cover.error,
        size,
      })}
    </View>
  );
  return Platform.OS === "android" ? (
    <Box
      modifiers={[
        fillMaxWidth(),
        onSizeChanged(({ width }) => setContainerWidth(width)),
      ]}
    >
      <RNHostView matchContents modifiers={[fillMaxWidth()]}>
        {surface}
      </RNHostView>
    </Box>
  ) : (
    surface
  );
}
