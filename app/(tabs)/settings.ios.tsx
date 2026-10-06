import SettingsProviders from "@/components/settings/providers";
import SettingsPrivacy from "@/components/settings/privacy";
import { Form, Host } from "@expo/ui/swift-ui";

export default function SettingsScreen() {
  return (
    <Host style={{ flex: 1 }}>
      <Form>
        <SettingsProviders />
        <SettingsPrivacy />
      </Form>
    </Host>
  );
}
