import { selectionFeedback } from "@/utils/runtime-feedback";
import { useAppTranslation } from "@/hooks/use-app-translation";
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
  const t = useAppTranslation();
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
          ? t("creator.matches", {
              count: candidate.count,
              texts: candidate.texts.slice(0, 6).join(", "),
            })
          : t("creator.noSelection"),
        true,
      )}
      {candidate?.valid &&
        copy(
          field === "totalEpisodesSelector" && candidate.values[0] === null
            ? t("creator.unknownTotalHelp")
            : t("creator.selectionGood"),
        )}
      {candidate?.error && copy(selectionFeedback(candidate, t))}
      {field === "coverImageSelector" && !candidate && (
        <ActionButton
          variant="tertiary"
          label={t(select ? "creator.tapCover" : "creator.selectCover")}
          onPress={startSelection}
          disabled={select || !ready || saving}
        />
      )}
      {candidate && (
        <ActionButton
          variant="tertiary"
          label={t("creator.changeSelection")}
          accessibilityLabel={t("creator.chooseAgain")}
          onPress={startSelection}
          disabled={!ready || saving}
        />
      )}
      <ActionButton
        expanded={advanced}
        label={t("creator.selectionTools")}
        onPress={() => updateWizard({ advanced: !advanced })}
        disabled={saving}
      />
      {advanced && (
        <View style={[styles.expandedTools, { borderColor: colors.border }]}>
          <View style={styles.row}>
            <ActionButton
              variant="tertiary"
              label={t("creator.parent")}
              accessibilityLabel={t("creator.selectParent")}
              onPress={() => send({ type: "parent" })}
              disabled={!select || saving}
            />
            <ActionButton
              variant="tertiary"
              label={t("creator.undo")}
              onPress={() => send({ type: "undo" })}
              disabled={!select || saving}
            />
          </View>
          {copy(t("creator.cssSelector"), true)}
          <ProviderInput
            accessibilityLabel={t("creator.cssSelector")}
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
              label={t("creator.testSelector")}
              onPress={testSelector}
              disabled={!ready || saving}
            />
          }
        </View>
      )}
    </>
  );
}
