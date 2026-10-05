import { useAppTranslation } from "@/hooks/use-app-translation";
import { Button, Host } from "@expo/ui/swift-ui";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import {
  accessibilityHint,
  accessibilityLabel,
  accessibilityValue,
  buttonStyle,
  controlSize,
  disabled as disabledModifier,
  frame,
} from "@expo/ui/swift-ui/modifiers";
import type { ActionButtonProps } from "./action-button";

export default function ActionButton({
  label,
  onPress,
  disabled = false,
  primary = false,
  variant = primary ? "primary" : "secondary",
  accessibilityLabel: labelForAccessibility = label,
  expanded,
}: ActionButtonProps) {
  const t = useAppTranslation();
  const prominent = variant === "primary";
  return (
    <Host matchContents style={{ maxWidth: "100%", flexShrink: 1 }}>
      <Button
        label={label}
        systemImage={
          expanded === undefined
            ? undefined
            : expanded
              ? "chevron.down"
              : "chevron.right"
        }
        onPress={onPress}
        modifiers={[
          buttonStyle(
            variant === "tertiary"
              ? "borderless"
              : isLiquidGlassAvailable()
                ? prominent
                  ? "glassProminent"
                  : "glass"
                : prominent
                  ? "borderedProminent"
                  : "bordered",
          ),
          controlSize(variant === "tertiary" ? "small" : "regular"),
          disabledModifier(disabled),
          accessibilityLabel(labelForAccessibility),
          ...(expanded === undefined
            ? []
            : [
                frame({ minHeight: 44 }),
                accessibilityValue(
                  expanded ? t("common.expanded") : t("common.collapsed"),
                ),
                accessibilityHint(
                  expanded
                    ? t("common.collapseSection")
                    : t("common.expandSection"),
                ),
              ]),
        ]}
      />
    </Host>
  );
}
