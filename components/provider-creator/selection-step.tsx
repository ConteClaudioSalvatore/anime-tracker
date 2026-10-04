import { Text, View } from "react-native";
import type { ProviderCreator } from "@/hooks/provider-creator/use-provider-creator";
import ActionButton from "./action-button";
import ProviderInput from "./provider-input";
import { styles } from "./creator-styles";

type Props = {
  creator: Pick<
    ProviderCreator,
    "colors" | "field" | "state" | "actions" | "browser"
  >;
};
export function SelectionStep({ creator }: Props) {
  const { colors, field, state, actions, browser } = creator;
  const { saving } = state.setup;
  const { advanced } = state.wizard;
  const { ready } = state.browser;
  const { select, manualSelector, candidate } = state.selection;
  const { updateWizard, updateSelection } = actions;
  const { send, startSelection, testSelector } = browser;
  const copy = (value: string, muted = false) => (
    <Text style={[styles.copy, { color: muted ? colors.muted : colors.text }]}>
      {value}
    </Text>
  );
  return (
    <>
      {copy(
        candidate
          ? candidate.count +
              " matches · " +
              candidate.texts.slice(0, 6).join(", ")
          : "No selection yet",
        true,
      )}
      {candidate?.valid &&
        copy(
          field === "totalEpisodesSelector" && candidate.values[0] === null
            ? "Total not announced yet. Progress tracking will still work."
            : "Selection looks good. Continue when the preview matches the website.",
        )}
      {candidate?.error && copy(candidate.error)}
      {candidate && (
        <ActionButton
          variant="tertiary"
          label="Change selection"
          accessibilityLabel="Choose again"
          onPress={startSelection}
          disabled={!ready || saving}
        />
      )}
      <ActionButton
        expanded={advanced}
        label="Selection tools"
        onPress={() => updateWizard({ advanced: !advanced })}
        disabled={saving}
      />
      {advanced && (
        <View style={[styles.expandedTools, { borderColor: colors.border }]}>
          <View style={styles.row}>
            <ActionButton
              variant="tertiary"
              label="Parent"
              accessibilityLabel="Select surrounding element"
              onPress={() => send({ type: "parent" })}
              disabled={!select || saving}
            />
            <ActionButton
              variant="tertiary"
              label={"Undo"}
              onPress={() => send({ type: "undo" })}
              disabled={!select || saving}
            />
          </View>
          {copy("CSS selector", true)}
          <ProviderInput
            accessibilityLabel="CSS selector"
            value={manualSelector}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(manualSelector) =>
              updateSelection({ manualSelector })
            }
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
          />
          {
            <ActionButton
              variant="tertiary"
              label={"Test selector"}
              onPress={testSelector}
              disabled={!ready || saving}
            />
          }
        </View>
      )}
    </>
  );
}
