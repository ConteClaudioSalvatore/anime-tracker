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
  const { pages, saving } = state.setup;
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
        {!collapsed && (
          <>
            {copy(instructions[step])}
            {step === 0 && <WebsiteStep creator={creator} />}
            {step === 1 && <ExamplePagesStep creator={creator} />}
            {field && <SelectionStep creator={creator} />}
            {step === 5 && <PlaybackStep creator={creator} />}
            {step === 6 && <ReviewStep creator={creator} />}
          </>
        )}
        {step === 6 &&
          (reviewPage
            ? copy(
                "Checking example " +
                  (pages.indexOf(reviewPage) + 1) +
                  " of " +
                  pages.length +
                  "…",
                true,
              )
            : saveError
              ? copy(saveError)
              : copy("Both example pages passed. Ready to save."))}
        {!!error && (
          <Text
            accessibilityRole="alert"
            style={[styles.copy, { color: colors.error }]}
          >
            {error}
          </Text>
        )}
        {!canContinue && step < 6 && copy(hint, true)}
      </ScrollView>
      <View style={styles.footer}>
        <View style={[styles.row, styles.navigation]}>
          {step > 0 && (
            <ActionButton
              variant="tertiary"
              expanded={!collapsed}
              label="Details"
              accessibilityLabel={
                collapsed ? "Show instructions" : "Hide details"
              }
              onPress={() => updateWizard({ collapsed: !collapsed })}
              disabled={saving}
            />
          )}
          {field && select && (
            <ActionButton
              variant="tertiary"
              label="Browse"
              onPress={() => updateSelection({ select: false })}
              disabled={!ready || saving}
            />
          )}
          <View style={styles.spacer} />
          {step > 0 && (
            <ActionButton
              variant="tertiary"
              label="Previous"
              accessibilityLabel="Previous step"
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
