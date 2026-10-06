import { useAppTranslation } from "@/hooks/use-app-translation";
import { Text, View } from "react-native";
import type { ProviderCreator } from "@/hooks/provider-creator/use-provider-creator";
import ActionButton from "./action-button";
import ProviderInput from "./provider-input";
import { styles } from "./creator-styles";
import { useRouter } from "expo-router";

type Props = {
  creator: Pick<
    ProviderCreator,
    "colors" | "edit" | "changeWebsite" | "state" | "actions"
  >;
};
export function WebsiteStep({ creator }: Props) {
  const t = useAppTranslation();
  const router = useRouter();
  const { colors, edit, changeWebsite, state, actions } = creator;
  const { draft, aliasInput } = state.setup;
  const { advanced } = state.wizard;

  const { updateSetup, updateWizard } = actions;
  const copy = (value: string, muted = false) => (
    <Text style={[styles.copy, { color: muted ? colors.muted : colors.text }]}>
      {value}
    </Text>
  );
  return (
    <>
      {copy(t("provider.name"))}
      <ProviderInput
        accessibilityLabel={t("provider.name")}
        placeholder={t("provider.namePlaceholder")}
        placeholderTextColor={colors.muted}
        value={draft.name ?? ""}
        onChangeText={(name) => edit({ ...draft, name })}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border },
        ]}
      />
      {copy(t("provider.homepage"))}
      <ProviderInput
        accessibilityLabel={t("provider.homepage")}
        placeholder="https://example.com"
        placeholderTextColor={colors.muted}
        value={draft.origin ?? ""}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        onChangeText={changeWebsite}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border },
        ]}
      />
      {copy(t("provider.homepageHelp"), true)}
      {copy(t("provider.privacyHelp"), true)}
      <ActionButton
        variant="tertiary"
        label={t("privacy.title")}
        onPress={() => router.push("/privacy")}
      />
      <ActionButton
        expanded={advanced}
        label={t("provider.aliases")}
        onPress={() => updateWizard({ advanced: !advanced })}
      />
      {advanced && (
        <View style={[styles.expandedTools, { borderColor: colors.border }]}>
          {copy(t("provider.aliasHelp"), true)}
          <ProviderInput
            accessibilityLabel={t("provider.aliases")}
            placeholder="https://mirror.example.com"
            placeholderTextColor={colors.muted}
            value={aliasInput}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) => {
              updateSetup({ aliasInput: value, dirty: true });
            }}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
          />
          {draft.whiteListedOrigins.map((origin) => (
            <View key={origin} style={styles.example}>
              {copy(origin)}
              <ActionButton
                variant="tertiary"
                label={t("provider.removeAlias", { origin })}
                onPress={() =>
                  edit({
                    ...draft,
                    whiteListedOrigins: draft.whiteListedOrigins.filter(
                      (item) => item !== origin,
                    ),
                  })
                }
              />
            </View>
          ))}
        </View>
      )}
    </>
  );
}
