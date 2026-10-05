import { useAppTranslation } from "@/hooks/use-app-translation";
import { Text, View } from "react-native";
import type { ProviderCreator } from "@/hooks/provider-creator/use-provider-creator";
import { steps } from "./creator-config";
import { styles } from "./creator-styles";

type Props = { creator: Pick<ProviderCreator, "colors" | "state"> };
export function CreatorHeader({ creator }: Props) {
  const t = useAppTranslation();
  const { colors, state } = creator;
  const { step } = state.wizard;
  const copy = (value: string, muted = false) => (
    <Text style={[styles.copy, { color: muted ? colors.muted : colors.text }]}>
      {value}
    </Text>
  );
  return (
    <View style={styles.header}>
      <View style={styles.heading}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          {t(steps[step])}
        </Text>
        {copy(step + 1 + " / " + steps.length, true)}
      </View>
      <View style={styles.progress}>
        {steps.map((title, index) => (
          <View
            key={title}
            style={[
              styles.dot,
              {
                backgroundColor: index <= step ? colors.accent : colors.border,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}
