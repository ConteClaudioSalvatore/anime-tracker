import type { AnimeEditor } from "@/hooks/use-anime-editor";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Button, Host } from "@expo/ui";
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRef } from "react";

export default function AnimeEditorForm({ editor }: { editor: AnimeEditor }) {
  const {
    t,
    fields,
    saving,
    canSave,
    change,
    save,
    error,
    episodeError,
    totalError,
  } = editor;
  const episodeInput = useRef<TextInput>(null);
  const background = useThemeColor(
    { light: "#f2f2f7", dark: "#000000" },
    "background",
  );
  const surface = useThemeColor(
    { light: "#ffffff", dark: "#1c1c1e" },
    "background",
  );
  const text = useThemeColor({}, "text");
  const secondary = useThemeColor(
    { light: "#62626a", dark: "#b0b0b8" },
    "text",
  );
  const danger = useThemeColor({ light: "#b3261e", dark: "#ffb4ab" }, "text");

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={[styles.screen, { backgroundColor: background }]}
    >
      <KeyboardAvoidingView style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: secondary }]}>
              {t("anime.series")}
            </Text>
            <View style={[styles.card, { backgroundColor: surface }]}>
              <Text style={[styles.label, { color: secondary }]}>
                {t("anime.nameLabel")}
              </Text>
              <TextInput
                value={fields.name}
                onChangeText={(value) => change("name", value)}
                accessibilityLabel={t("anime.nameLabel")}
                placeholder={t("anime.namePlaceholder")}
                placeholderTextColor={secondary}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!saving}
                returnKeyType="next"
                onSubmitEditing={() => episodeInput.current?.focus()}
                style={[styles.input, { color: text }]}
              />
            </View>
            <Text style={[styles.help, { color: secondary }]}>
              {t("anime.nameHelp")}
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: secondary }]}>
              {t("anime.progress")}
            </Text>
            <View style={[styles.card, { backgroundColor: surface }]}>
              <Text style={[styles.label, { color: secondary }]}>
                {t("anime.episodeLabel")}
              </Text>
              <TextInput
                ref={episodeInput}
                value={fields.episode}
                onChangeText={(value) => change("episode", value)}
                accessibilityLabel={t("anime.episodeLabel")}
                placeholder="0"
                placeholderTextColor={secondary}
                keyboardType="number-pad"
                editable={!saving}
                style={[styles.input, styles.episode, { color: text }]}
              />
            </View>
            <Text
              style={[
                styles.help,
                { color: episodeError ? danger : secondary },
              ]}
            >
              {episodeError || t("anime.episodeHelp")}
            </Text>
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: secondary }]}>
              {t("anime.totalLabel")}
            </Text>
            <View style={[styles.card, { backgroundColor: surface }]}>
              <TextInput
                value={fields.total}
                onChangeText={(value) => change("total", value)}
                accessibilityLabel={t("anime.totalLabel")}
                placeholder="?"
                placeholderTextColor={secondary}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!saving}
                style={[styles.input, styles.episode, { color: text }]}
              />
            </View>
            <Text
              style={[styles.help, { color: totalError ? danger : secondary }]}
            >
              {totalError || t("anime.totalHelp")}
            </Text>
          </View>
          {error && (
            <Text
              accessibilityRole="alert"
              style={[styles.help, { color: danger }]}
            >
              {error}
            </Text>
          )}
          <Host
            matchContents={{ vertical: true }}
            style={{ alignSelf: "stretch" }}
          >
            <Button
              label={editor.saveLabel}
              disabled={!canSave}
              onPress={() => {
                void save();
              }}
              style={{ width: "100%", paddingVertical: 8 }}
            />
          </Host>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 28 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "600", paddingHorizontal: 4 },
  card: { borderRadius: 20, padding: 16, gap: 8 },
  label: { fontSize: 14, fontWeight: "600" },
  input: {
    fontSize: 17,
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  episode: { fontSize: 28, fontWeight: "600" },
  help: { fontSize: 14, lineHeight: 20, paddingHorizontal: 4 },
});
