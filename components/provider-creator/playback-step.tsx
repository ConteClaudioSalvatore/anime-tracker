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
            copy("Primary player " + (index + 1))
          ) : (
            <ActionButton
              label={"Choose player " + (index + 1)}
              onPress={() => choosePlayer(player)}
              disabled={saving}
            />
          )}
          {copy(
            player.time.toFixed(1) +
              " / " +
              player.duration.toFixed(1) +
              " seconds · " +
              (player.progress ? "Tracking ready" : "Waiting for playback") +
              (player.resume ? " · Automatic resume verified" : ""),
            true,
          )}
        </View>
      ))}
      {videoPhase === "waiting" &&
        copy(
          "Tap the website’s player placeholder or Play button. We’ll detect the video when it appears. If several players appear, choose the primary one.",
          true,
        )}
      {inaccessible > 0 &&
        frameTrackingAvailable === false &&
        copy(
          "This device cannot inspect embedded players. Update Android System WebView and retry.",
          true,
        )}
      {videoPhase === "paused" &&
        copy(
          "Player detected. Press Play on the website to verify progress tracking.",
          true,
        )}
      {videoPhase === "verified" &&
        copy(
          "Playback tracking is ready. Continue to Review. You can also check automatic resume in Video options.",
        )}
      <ActionButton
        expanded={advanced}
        label="Video options"
        onPress={() => updateWizard({ advanced: !advanced })}
        disabled={saving}
      />
      {advanced && (
        <View style={[styles.expandedTools, { borderColor: colors.border }]}>
          {copy("Automatic resume (optional)")}
          {copy(
            selectedPlayer?.resume
              ? "Automatic resume verified."
              : resumeTest === "testing"
                ? "Checking automatic resume…"
                : resumeTest === "failed"
                  ? "Resume could not be verified. You can continue with progress tracking or retry."
                  : selectedPlayer?.seekable === false
                    ? "Automatic resume is not available yet. You can continue once progress is verified."
                    : "This check briefly seeks one second, then restores the playback position. It is not required to continue.",
            true,
          )}
          {!selectedPlayer?.resume && (
            <ActionButton
              variant="tertiary"
              label={
                resumeTest === "testing"
                  ? "Checking resume…"
                  : resumeTest === "failed"
                    ? "Retry resume check"
                    : "Check automatic resume"
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
            label={"Retry playback check"}
            onPress={retryPlayback}
            disabled={!ready || saving}
          />
          <ActionButton
            variant="tertiary"
            label="Playback help"
            onPress={() => updatePlayback({ videoHelp: true })}
            disabled={saving}
          />
        </View>
      )}
      {(timedOut || videoHelp) && (
        <>
          {copy(
            selectedPlayer?.progress
              ? "Progress tracking is verified. Automatic resume is an optional check in Video options."
              : "Tap the player placeholder, choose the site’s primary player, and press Play. If you have done that and it still cannot be verified, this site may not be supported.",
          )}
          {!selectedPlayer?.progress && (
            <>
              {inaccessible > 0 &&
                frameTrackingAvailable !== false &&
                copy(
                  "Some embedded frames are not reporting a video yet. Activate the primary player and retry.",
                  true,
                )}
              {copy(
                "If you save anyway, playback progress and automatic resume may not work. Some embedded players do not expose a trackable video.",
                true,
              )}
              {saveAnyway ? (
                copy("Limitations acknowledged", true)
              ) : (
                <ActionButton
                  label="Continue with limitations"
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
