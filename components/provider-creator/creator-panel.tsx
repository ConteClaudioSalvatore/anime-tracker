import { formatMessage } from "@/utils/i18n";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { ScrollView, Text, View } from "react-native";
import type { ProviderCreator } from "@/hooks/provider-creator/use-provider-creator";
import ActionButton from "./action-button";
import ProviderSurface from "./provider-surface";
import { instructions } from "./creator-config";
import { styles } from "./creator-styles";
import { WebsiteStep } from "./website-step";
import { ExamplePagesStep } from "./example-pages-step";
import { SelectionStep } from "./selection-step";
import { PlaybackStep } from "./playback-step";
import { ReviewStep } from "./review-step";

type Props = { creator: ProviderCreator };
export function CreatorPanel({ creator }: Props) {
  const t = useAppTranslation();
  const {
    colors,
    field,
    go,
    canContinue,
    hint,
    saveError,
    primaryAction,
    state,
    actions,
  } = creator;
  const { draft, pages, saving } = state.setup;
  const { step, error, collapsed } = state.wizard;
  const { ready } = state.browser;
  const { select } = state.selection;
  const { reviewPage } = state;
  const { updateWizard, updateSelection } = actions;
  const copy = (value: string, muted = false) => (
    <Text style={[styles.copy, { color: muted ? colors.muted : colors.text }]}>
      {value}
    </Text>
  );
  return (
    <ProviderSurface
      style={[
        styles.panel,
        { backgroundColor: colors.card },
        styles.iosSurface,
        step > 0 ? styles.compactPanel : styles.screen,
      ]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.panelScroll}
        contentContainerStyle={styles.panelContent}
      >
        {creator.browser.loadHelpVisible && (
          <View style={styles.example}>
            {copy(t("creator.loadHelp"))}
            <View style={[styles.row, { alignItems: "center" }]}>
              <ActionButton
                label={t("creator.pageUsable")}
                onPress={creator.browser.confirmUsablePage}
                disabled={saving}
              />
              <ActionButton
                variant="tertiary"
                label={t("creator.keepWaiting")}
                onPress={creator.browser.keepWaiting}
                disabled={saving}
              />
            </View>
          </View>
        )}
        {!collapsed && (
          <>
            {copy(t(instructions[step]))}
            {step === 0 && <WebsiteStep creator={creator} />}
            {step === 1 && <ExamplePagesStep creator={creator} />}
            {field && <SelectionStep creator={creator} />}
            {step === 6 && <PlaybackStep creator={creator} />}
            {step === 7 && <ReviewStep creator={creator} />}
          </>
        )}
        {step === 7 &&
          (reviewPage
            ? copy(
                t("creator.checkingExample", {
                  index: pages.indexOf(reviewPage) + 1,
                  count: pages.length,
                }),
                true,
              )
            : saveError
              ? copy(saveError)
              : copy(t("creator.reviewPassed")))}
        {!!error && (
          <Text
            accessibilityRole="alert"
            style={[styles.copy, { color: colors.error }]}
          >
            {formatMessage(error, t)}
          </Text>
        )}
        {!canContinue && step < 7 && copy(hint, true)}
      </ScrollView>
      <View style={styles.footer}>
        {step === 5 && (
          <View style={styles.row}>
            <ActionButton
              variant="tertiary"
              label={t("creator.skipCover")}
              onPress={creator.skipCover}
              disabled={saving}
            />
            {!!draft.coverImageSelector && (
              <ActionButton
                variant="tertiary"
                label={t("creator.keepCover")}
                onPress={() => go(6)}
                disabled={saving}
              />
            )}
          </View>
        )}

        <View style={[styles.row, styles.navigation]}>
          {step > 0 && (
            <ActionButton
              variant="tertiary"
              expanded={!collapsed}
              label={t("creator.details")}
              accessibilityLabel={
                collapsed
                  ? t("creator.showInstructions")
                  : t("creator.hideDetails")
              }
              onPress={() => updateWizard({ collapsed: !collapsed })}
              disabled={saving}
            />
          )}
          {field && select && (
            <ActionButton
              variant="tertiary"
              label={t("creator.browse")}
              onPress={() => updateSelection({ select: false })}
              disabled={!ready || saving}
            />
          )}
          <View style={styles.spacer} />
          {step > 0 && (
            <ActionButton
              variant="tertiary"
              label={t("common.previous")}
              accessibilityLabel={t("creator.previousStep")}
              onPress={() => go(step - 1)}
              disabled={saving}
            />
          )}
          <ActionButton {...primaryAction} variant="primary" />
        </View>
      </View>
    </ProviderSurface>
  );
}
