import { useAppTranslation } from "@/hooks/use-app-translation";
import { Button, Section, Text } from "@expo/ui/swift-ui";
import { useRouter } from "expo-router";

export default function SettingsPrivacy() {
  const t = useAppTranslation();
  const router = useRouter();
  return (
    <Section
      title={t("privacy.section")}
      footer={<Text>{t("privacy.summary")}</Text>}
    >
      <Button
        label={t("privacy.title")}
        systemImage="hand.raised"
        onPress={() => router.push("/privacy")}
      />
    </Section>
  );
}
