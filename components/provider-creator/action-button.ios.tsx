import { Button, Host } from '@expo/ui/swift-ui';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { accessibilityLabel, buttonStyle, controlSize, disabled as disabledModifier } from '@expo/ui/swift-ui/modifiers';
import type { ActionButtonProps } from './action-button';

export default function ActionButton({ label, onPress, disabled = false, primary = false, accessibilityLabel: labelForAccessibility = label }: ActionButtonProps) {
  return (
    <Host matchContents>
      <Button label={label} onPress={onPress} modifiers={[
        buttonStyle(isLiquidGlassAvailable() ? (primary ? 'glassProminent' : 'glass') : (primary ? 'borderedProminent' : 'bordered')),
        controlSize('regular'),
        disabledModifier(disabled),
        accessibilityLabel(labelForAccessibility),
      ]} />
    </Host>
  );
}
