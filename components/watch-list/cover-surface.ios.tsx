import { useContext, useState, type ReactNode } from "react";
import { Background, RNHostView, VStack } from "@expo/ui/swift-ui";
import { clipped, frame, onGeometryChange } from "@expo/ui/swift-ui/modifiers";
import { useCoverImage } from "@/hooks/use-cover-image";
import { CoverImage } from "./cover-image";
import {
  CoverViewportContext,
  intersectsCoverViewport,
} from "@/utils/cover-viewport";

export default function CoverSurface({
  url,
  children,
}: {
  url?: string;
  children: (visible: boolean) => ReactNode;
}) {
  const cover = useCoverImage(url);
  const viewport = useContext(CoverViewportContext);
  const [bounds, setBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const inViewport = intersectsCoverViewport(bounds, viewport);
  return (
    <Background modifiers={[clipped()]}>
      <VStack
        spacing={0}
        modifiers={[
          frame({ maxWidth: Infinity }),
          onGeometryChange((next) =>
            setBounds((previous) =>
              previous.x === next.x &&
              previous.y === next.y &&
              previous.width === next.width &&
              previous.height === next.height
                ? previous
                : next,
            ),
          ),
        ]}
      >
        {children(inViewport && cover.visible)}
      </VStack>
      <Background.Content>
        {cover.url && inViewport && (
          <RNHostView matchContents>
            <CoverImage
              size={bounds}
              url={cover.url}
              visible={cover.visible}
              onLoad={cover.onLoad}
              onError={cover.onError}
            />
          </RNHostView>
        )}
      </Background.Content>
    </Background>
  );
}
