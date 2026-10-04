import { Text, View } from "react-native";
import type { ProviderCreator } from "@/hooks/provider-creator/use-provider-creator";
import ActionButton from "./action-button";
import ProviderInput from "./provider-input";
import { styles } from "./creator-styles";

type Props = {
  creator: Pick<
    ProviderCreator,
    "colors" | "edit" | "changeWebsite" | "state" | "actions"
  >;
};
export function WebsiteStep({ creator }: Props) {
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
      {copy("Provider name")}
      <ProviderInput
        accessibilityLabel="Provider name"
        placeholder="My anime website"
        placeholderTextColor={colors.muted}
        value={draft.name ?? ""}
        onChangeText={(name) => edit({ ...draft, name })}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border },
        ]}
      />
      {copy("Homepage address")}
      <ProviderInput
        accessibilityLabel="Homepage address"
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
      {copy(
        "Paste the homepage URL from your browser. HTTPS is added if you leave it out.",
        true,
      )}
      <ActionButton
        expanded={advanced}
        label="Approved website aliases"
        onPress={() => updateWizard({ advanced: !advanced })}
      />
      {advanced && (
        <View style={[styles.expandedTools, { borderColor: colors.border }]}>
          {copy(
            "Only add other website addresses that this provider should be allowed to open. Separate addresses with commas. Embedded players do not need an alias.",
            true,
          )}
          <ProviderInput
            accessibilityLabel="Approved website aliases"
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
                label={"Remove alias " + origin}
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
