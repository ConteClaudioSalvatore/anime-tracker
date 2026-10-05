import {
  useAppTranslation,
  useMessageFormatter,
} from "@/hooks/use-app-translation";
import { Text, View } from "react-native";
import type { ProviderCreator } from "@/hooks/provider-creator/use-provider-creator";
import ActionButton from "./action-button";
import { editSteps } from "./creator-config";
import { extractionFeedback } from "@/utils/runtime-feedback";
import { styles } from "./creator-styles";

type Props = {
  creator: Pick<
    ProviderCreator,
    "colors" | "go" | "state" | "actions" | "browser"
  >;
};
export function ReviewStep({ creator }: Props) {
  const t = useAppTranslation();
  const format = useMessageFormatter();
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
        t("creator.progressResume", {
          progress: draft.verification?.progress
            ? t("creator.verified")
            : t("creator.notVerified"),
          resume: draft.verification?.resume
            ? t("creator.verified")
            : t("creator.resumeOptional"),
        }),
      )}
      {pages.length < 2 && (
        <>
          {copy(t("creator.addExamplesHelp"))}
          {
            <ActionButton
              label={t("creator.chooseExamples")}
              onPress={() => go(1)}
              disabled={saving}
            />
          }
        </>
      )}
      {pages.map((page, index) => (
        <View key={page} style={styles.example}>
          {copy(t("creator.example", { index: index + 1, url: page }), true)}
          {checks[page] &&
            copy(
              checks[page].valid
                ? t("creator.reviewResult", {
                    title: checks[page].title,
                    listed: checks[page].listedEpisodes ?? "?",
                    total:
                      checks[page].episodeCount > 0
                        ? t("creator.totalCount", {
                            count: checks[page].episodeCount,
                          })
                        : t("creator.totalUnknown"),
                  })
                : extractionFeedback(checks[page]).map(format).join(" "),
            )}
          {checks[page]?.valid === false && (
            <ActionButton
              label={t("creator.retestExample", { index: index + 1 })}
              onPress={() => testExample(page)}
              disabled={!!reviewPage || saving}
            />
          )}
        </View>
      ))}
      <ActionButton
        expanded={advanced}
        label={t("creator.editRetest")}
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
                label={t("creator.retestExample", {
                  index: pages.indexOf(page) + 1,
                })}
                onPress={() => testExample(page)}
                disabled={!!reviewPage || saving}
              />
            ))}
          {copy(t("creator.editStep"), true)}
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <ActionButton
              variant="tertiary"
              key={index}
              label={t(editSteps[index])}
              onPress={() => go(index)}
              disabled={saving}
            />
          ))}
        </View>
      )}
      {(!draft.verification?.progress || !draft.verification?.resume) &&
        copy(t("creator.unverifiedHelp"))}
    </>
  );
}
