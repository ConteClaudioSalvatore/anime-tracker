import { Text, View } from "react-native";
import type { ProviderCreator } from "@/hooks/provider-creator/use-provider-creator";
import ActionButton from "./action-button";
import { styles } from "./creator-styles";

type Props = { creator: Pick<ProviderCreator, "colors" | "state" | "actions"> };
export function ExamplePagesStep({ creator }: Props) {
  const { colors, state, actions } = creator;
  const { pages, saving } = state.setup;
  const { dispatch } = actions;
  const copy = (value: string, muted = false) => (
    <Text style={[styles.copy, { color: muted ? colors.muted : colors.text }]}>
      {value}
    </Text>
  );
  return (
    <>
      {copy(pages.length + " of 2 example pages chosen", true)}
      {pages.map((page, index) => (
        <View key={page} style={styles.example}>
          {copy("Example " + (index + 1) + ": " + page)}
          {
            <ActionButton
              variant="tertiary"
              label={"Remove example " + (index + 1)}
              onPress={() => dispatch({ type: "removePage", page })}
              disabled={saving}
            />
          }
        </View>
      ))}
    </>
  );
}
