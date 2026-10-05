import type { AnimeEditor } from "@/hooks/use-anime-editor";
import {
  Button,
  Form,
  Host,
  Section,
  Text,
  TextField,
  VStack,
  useNativeState,
} from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  autocorrectionDisabled,
  buttonStyle,
  controlSize,
  disabled,
  font,
  foregroundStyle,
  frame,
  keyboardType,
  listRowBackground,
  padding,
  textFieldStyle,
  textInputAutocapitalization,
} from "@expo/ui/swift-ui/modifiers";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { PlatformColor } from "react-native";

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
  const name = useNativeState(fields.name);
  const episode = useNativeState(fields.episode);
  const total = useNativeState(fields.total);
  const secondary = { type: "hierarchical", style: "secondary" } as const;

  return (
    <Host
      style={{
        flex: 1,
        backgroundColor: PlatformColor("systemGroupedBackgroundColor"),
      }}
    >
      <Form>
        <Section
          title={t("anime.series")}
          footer={<Text>{t("anime.nameHelp")}</Text>}
        >
          <VStack
            alignment="leading"
            spacing={10}
            modifiers={[padding({ vertical: 8 })]}
          >
            <Text
              modifiers={[
                font({ textStyle: "subheadline", weight: "semibold" }),
                foregroundStyle(secondary),
              ]}
            >
              {t("anime.nameLabel")}
            </Text>
            <TextField
              text={name}
              placeholder={t("anime.namePlaceholder")}
              onTextChange={(value) => change("name", value)}
              modifiers={[
                textFieldStyle("plain"),
                font({ textStyle: "body" }),
                frame({ maxWidth: Infinity, minHeight: 44 }),
                accessibilityLabel(t("anime.nameLabel")),
                autocorrectionDisabled(),
                textInputAutocapitalization("words"),
                disabled(saving),
              ]}
            />
          </VStack>
        </Section>
        <Section
          title={t("anime.progress")}
          footer={<Text>{episodeError || t("anime.episodeHelp")}</Text>}
        >
          <VStack
            alignment="leading"
            spacing={10}
            modifiers={[padding({ vertical: 8 })]}
          >
            <Text
              modifiers={[
                font({ textStyle: "subheadline", weight: "semibold" }),
                foregroundStyle(secondary),
              ]}
            >
              {t("anime.episodeLabel")}
            </Text>
            <TextField
              text={episode}
              placeholder="0"
              onTextChange={(value) => change("episode", value)}
              modifiers={[
                textFieldStyle("plain"),
                keyboardType("numeric"),
                font({
                  textStyle: "title2",
                  weight: "semibold",
                  design: "rounded",
                }),
                frame({ maxWidth: Infinity, minHeight: 44 }),
                accessibilityLabel(t("anime.episodeLabel")),
                disabled(saving),
              ]}
            />
          </VStack>
        </Section>
        <Section
          title={t("anime.totalLabel")}
          footer={<Text>{totalError || t("anime.totalHelp")}</Text>}
        >
          <TextField
            text={total}
            placeholder="?"
            onTextChange={(value) => change("total", value)}
            modifiers={[
              textFieldStyle("plain"),
              keyboardType("numbers-and-punctuation"),
              textInputAutocapitalization("never"),
              autocorrectionDisabled(),
              font({
                textStyle: "title2",
                weight: "semibold",
                design: "rounded",
              }),
              frame({ maxWidth: Infinity, minHeight: 44 }),
              accessibilityLabel(t("anime.totalLabel")),
              disabled(saving),
              padding({ vertical: 8 }),
            ]}
          />
        </Section>
        <Section>
          {error && (
            <Text
              modifiers={[foregroundStyle(PlatformColor("systemRedColor"))]}
            >
              {error}
            </Text>
          )}
          <Button
            label={editor.saveLabel}
            onPress={() => {
              void save();
            }}
            modifiers={[
              buttonStyle(
                isLiquidGlassAvailable()
                  ? "glassProminent"
                  : "borderedProminent",
              ),
              controlSize("large"),
              disabled(!canSave),
              frame({ maxWidth: Infinity, minHeight: 48 }),
              listRowBackground("clear"),
            ]}
          />
        </Section>
      </Form>
    </Host>
  );
}
