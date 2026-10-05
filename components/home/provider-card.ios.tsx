import {
  Button,
  Host,
  HStack,
  Image,
  Label,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonStyle,
  contentShape,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  multilineTextAlignment,
  padding,
  shapes,
} from "@expo/ui/swift-ui/modifiers";
import { PlatformColor } from "react-native";
import ProviderSurface from "@/components/provider-creator/provider-surface";
import { useAppTranslation } from "@/hooks/use-app-translation";
import type { ProviderCardProps } from "./provider-card";

export default function ProviderCard({ provider, onPress }: ProviderCardProps) {
  const t = useAppTranslation();
  const verified = !!provider.verification?.progress;
  const status = t(
    verified ? "provider.trackingReady" : "provider.trackingUnverified",
  );

  return (
    <ProviderSurface>
      <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
        <Button
          onPress={onPress}
          modifiers={[
            buttonStyle("plain"),
            accessibilityLabel(
              `${t("provider.openNamed", { name: provider.name })}, ${provider.origin}, ${status}`,
            ),
          ]}
        >
          <HStack
            spacing={16}
            modifiers={[
              padding({ all: 20 }),
              frame({ maxWidth: Infinity, minHeight: 100 }),
              contentShape(shapes.rectangle()),
            ]}
          >
            <Image
              systemName="globe"
              size={32}
              color={PlatformColor("systemBlue")}
            />
            <VStack
              alignment="leading"
              spacing={6}
              modifiers={[frame({ maxWidth: Infinity, alignment: "leading" })]}
            >
              <Text
                modifiers={[
                  font({ textStyle: "headline" }),
                  foregroundStyle({ type: "hierarchical", style: "primary" }),
                  multilineTextAlignment("leading"),
                  fixedSize({ horizontal: false, vertical: true }),
                ]}
              >
                {provider.name}
              </Text>
              <Text
                modifiers={[
                  font({ textStyle: "subheadline" }),
                  foregroundStyle({ type: "hierarchical", style: "secondary" }),
                  multilineTextAlignment("leading"),
                  fixedSize({ horizontal: false, vertical: true }),
                ]}
              >
                {provider.origin.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </Text>
              <Label
                title={status}
                systemImage={verified ? "checkmark.circle.fill" : "info.circle"}
                modifiers={[
                  font({ textStyle: "caption" }),
                  foregroundStyle(
                    verified
                      ? PlatformColor("systemGreen")
                      : { type: "hierarchical", style: "secondary" },
                  ),
                  fixedSize({ horizontal: false, vertical: true }),
                ]}
              />
            </VStack>
            <Image
              systemName="chevron.right"
              size={14}
              modifiers={[
                foregroundStyle({ type: "hierarchical", style: "tertiary" }),
              ]}
            />
          </HStack>
        </Button>
      </Host>
    </ProviderSurface>
  );
}
