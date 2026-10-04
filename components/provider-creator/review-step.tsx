import { Text, View } from "react-native";
import type { ProviderCreator } from "@/hooks/provider-creator/use-provider-creator";
import ActionButton from "./action-button";
import { steps } from "./creator-config";
import { styles } from "./creator-styles";

type Props = {
  creator: Pick<
    ProviderCreator,
    "colors" | "go" | "state" | "actions" | "browser"
  >;
};
export function ReviewStep({ creator }: Props) {
  const { colors, go, state, actions, browser } = creator;
  const { draft, pages, checks, saving } = state.setup;
  const { advanced } = state.wizard;
  const { reviewPage } = state;
  const { updateWizard } = actions;
  const { testExample } = browser;
  const copy = (value: string, muted = false) => (
    <Text style={[styles.copy, { color: muted ? colors.muted : colors.text }]}>
      {value}
    </Text>
  );
  return (
    <>
      {copy((draft.name ?? "") + " · " + draft.origin)}
      {copy(
        "Progress: " +
          (draft.verification?.progress ? "verified" : "not verified") +
          " · Resume: " +
          (draft.verification?.resume ? "verified" : "not verified (optional)"),
      )}
      {pages.length < 2 && (
        <>
          {copy("Add two example pages to verify this provider.")}
          {
            <ActionButton
              label={"Choose example pages"}
              onPress={() => go(1)}
              disabled={saving}
            />
          }
        </>
      )}
      {pages.map((page, index) => (
        <View key={page} style={styles.example}>
          {copy("Example " + (index + 1) + ": " + page, true)}
          {checks[page] &&
            copy(
              checks[page].valid
                ? checks[page].title +
                    " · " +
                    (checks[page].listedEpisodes ?? "?") +
                    " listed · " +
                    (checks[page].episodeCount > 0
                      ? checks[page].episodeCount + " total episodes"
                      : "total unknown") +
                    " — passed"
                : checks[page].errors.join(" "),
            )}
          {checks[page]?.valid === false && (
            <ActionButton
              label={"Retest example " + (index + 1)}
              onPress={() => testExample(page)}
              disabled={!!reviewPage || saving}
            />
          )}
        </View>
      ))}
      <ActionButton
        expanded={advanced}
        label="Edit setup or retest"
        onPress={() => updateWizard({ advanced: !advanced })}
        disabled={saving}
      />
      {advanced && (
        <View style={[styles.expandedTools, { borderColor: colors.border }]}>
          {pages
            .filter((page) => checks[page]?.valid !== false)
            .map((page) => (
              <ActionButton
                key={page}
                variant="tertiary"
                label={"Retest example " + (pages.indexOf(page) + 1)}
                onPress={() => testExample(page)}
                disabled={!!reviewPage || saving}
              />
            ))}
          {copy("Edit a step", true)}
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <ActionButton
              variant="tertiary"
              key={index}
              label={"Edit " + steps[index].toLowerCase()}
              onPress={() => go(index)}
              disabled={saving}
            />
          ))}
        </View>
      )}
      {(!draft.verification?.progress || !draft.verification?.resume) &&
        copy(
          "This provider has unverified video features. Return to Video test to retry or explicitly acknowledge the limitations.",
        )}
    </>
  );
}
