import { useState, type ReactNode } from "react";
import { Background, RNHostView, VStack } from "@expo/ui/swift-ui";
import { clipped, frame, onGeometryChange } from "@expo/ui/swift-ui/modifiers";
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
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <Background modifiers={[clipped()]}>
      <VStack
        spacing={0}
        modifiers={[
          frame({ maxWidth: Infinity }),
          onGeometryChange(({ width, height }) =>
            setSize((previous) =>
              previous.width === width && previous.height === height
                ? previous
                : { width, height },
            ),
          ),
        ]}
      >
        {children(cover.visible)}
      </VStack>
      <Background.Content>
        {cover.url && size.width > 0 && size.height > 0 && (
          <RNHostView matchContents>
            <CoverImage
              size={size}
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
