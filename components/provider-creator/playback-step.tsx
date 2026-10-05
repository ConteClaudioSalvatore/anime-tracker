import { useAppTranslation } from "@/hooks/use-app-translation";
import { Text, View } from "react-native";
import type { ProviderCreator } from "@/hooks/provider-creator/use-provider-creator";
import ActionButton from "./action-button";
import { styles } from "./creator-styles";

type Props = {
  creator: Pick<
    ProviderCreator,
    "colors" | "selectedPlayer" | "videoPhase" | "state" | "actions" | "browser"
  >;
};
export function PlaybackStep({ creator }: Props) {
  const t = useAppTranslation();
  const { colors, selectedPlayer, videoPhase, state, actions, browser } =
    creator;
  const { saveAnyway, saving } = state.setup;
  const { advanced } = state.wizard;
  const { ready } = state.browser;
  const {
    players,
    playerKey,
    inaccessible,
    frameTrackingAvailable,
    timedOut,
    videoHelp,
    resumeTest,
  } = state.playback;
  const { updateSetup, updateWizard, updatePlayback } = actions;
  const { choosePlayer, retryPlayback, checkResume } = browser;
  const copy = (value: string, muted = false) => (
    <Text style={[styles.copy, { color: muted ? colors.muted : colors.text }]}>
      {value}
    </Text>
  );
  return (
    <>
      {players.map((player, index) => (
        <View key={JSON.stringify(player.locator)} style={styles.example}>
          {playerKey === JSON.stringify(player.locator) ? (
            copy(t("playback.primaryPlayer", { index: index + 1 }))
          ) : (
            <ActionButton
              label={t("playback.choosePlayer", { index: index + 1 })}
              onPress={() => choosePlayer(player)}
              disabled={saving}
            />
          )}
          {copy(
            t("playback.sample", {
              time: player.time.toFixed(1),
              duration: player.duration.toFixed(1),
              status: player.progress
                ? t("playback.ready")
                : t("playback.waiting"),
              resume: player.resume ? t("playback.resumeVerifiedSuffix") : "",
            }),
            true,
          )}
        </View>
      ))}
      {videoPhase === "waiting" && copy(t("playback.activateHelp"), true)}
      {inaccessible > 0 &&
        frameTrackingAvailable === false &&
        copy(t("playback.inaccessibleHelp"), true)}
      {videoPhase === "paused" && copy(t("playback.pausedHelp"), true)}
      {videoPhase === "verified" && copy(t("playback.verifiedHelp"))}
      <ActionButton
        expanded={advanced}
        label={t("playback.options")}
        onPress={() => updateWizard({ advanced: !advanced })}
        disabled={saving}
      />
      {advanced && (
        <View style={[styles.expandedTools, { borderColor: colors.border }]}>
          {copy(t("playback.resumeOptional"))}
          {copy(
            selectedPlayer?.resume
              ? t("playback.resumeVerified")
              : resumeTest === "testing"
                ? t("playback.resumeChecking")
                : resumeTest === "failed"
                  ? t("playback.resumeFailed")
                  : selectedPlayer?.seekable === false
                    ? t("playback.resumeUnavailable")
                    : t("playback.resumeExplain"),
            true,
          )}
          {!selectedPlayer?.resume && (
            <ActionButton
              variant="tertiary"
              label={
                resumeTest === "testing"
                  ? t("playback.checkingResume")
                  : resumeTest === "failed"
                    ? t("playback.retryResume")
                    : t("playback.checkResume")
              }
              onPress={checkResume}
              disabled={
                !ready ||
                !selectedPlayer?.progress ||
                selectedPlayer.seekable === false ||
                resumeTest === "testing" ||
                saving
              }
            />
          )}
          <ActionButton
            variant="tertiary"
            label={t("playback.retry")}
            onPress={retryPlayback}
            disabled={!ready || saving}
          />
          <ActionButton
            variant="tertiary"
            label={t("playback.help")}
            onPress={() => updatePlayback({ videoHelp: true })}
            disabled={saving}
          />
        </View>
      )}
      {(timedOut || videoHelp) && (
        <>
          {copy(
            selectedPlayer?.progress
              ? t("playback.progressVerifiedHelp")
              : t("playback.unsupportedHelp"),
          )}
          {!selectedPlayer?.progress && (
            <>
              {inaccessible > 0 &&
                frameTrackingAvailable !== false &&
                copy(t("playback.framesHelp"), true)}
              {copy(t("playback.limitationsHelp"), true)}
              {saveAnyway ? (
                copy(t("playback.acknowledged"), true)
              ) : (
                <ActionButton
                  label={t("playback.continueLimited")}
                  onPress={() => {
                    updateSetup({ saveAnyway: true, dirty: true });
                  }}
                  disabled={saving}
                />
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
