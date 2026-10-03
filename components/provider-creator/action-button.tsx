import { Pressable, Text, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ActionButtonProps = {
  label: string; onPress: () => void; disabled?: boolean; primary?: boolean; accessibilityLabel?: string;
};

export default function ActionButton({ label, onPress, disabled = false, primary = false, accessibilityLabel = label }: ActionButtonProps) {
  const dark = useColorScheme() === 'dark';
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress} style={[styles.button, { backgroundColor: primary ? '#2463dc' : dark ? '#1d2633' : '#fff' }, disabled && styles.disabled]}>
    <Text style={{ color: primary || dark ? '#fff' : '#182437', fontWeight: '600', fontSize: 14 }}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#8a9bb8', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
});
