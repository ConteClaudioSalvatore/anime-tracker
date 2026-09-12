import { useProviderCreator } from "@/utils/provider-creator.utils";
import { Button, Column, Icon, Row, Text } from "@expo/ui";
import { weight, width } from "@expo/ui/jetpack-compose/modifiers";
import BottomUtility from "./bottom-utility";
import { useRouter } from "expo-router";

export default function Done() {
  const ctx = useProviderCreator();
  const router = useRouter();

  const { providerDraft, saveProvider } = ctx;

  const infos = [
    { label: "Website base url", value: providerDraft.origin },
    { label: "Series page base url", value: providerDraft.seriesPageOrigin },
    { label: "Series name selector", value: providerDraft.seriesNameSelector },
    {
      label: "Episode number selector",
      value: providerDraft.episodeNumberSelector,
    },
    {
      label: "Total episodes selector",
      value: providerDraft.totalEpisodesSelector,
    },
    {
      label: "Player supported",
      value: providerDraft.isPlayerSupported ? "Yes" : "No",
    },
  ];

  return (
    <BottomUtility
      stepTitle="Finishing Setup"
      stepInfo={
        <Text textStyle={{ color: "white", fontSize: 18, textAlign: "left" }}>
          Now we need to learn how to identify the episode video player.
        </Text>
      }
      afterNext={
        <Button
          onPress={async () => {
            await saveProvider();
            router.canGoBack() && router.back();
          }}
        >
          <Icon
            name={Icon.select({
              ios: "checkmark",
              android: import("@expo/material-symbols/save.xml"),
            })}
          />
          <Text>Save</Text>
        </Button>
      }
    >
      <Column alignment="start" spacing={8}>
        {infos.map((info, index) => (
          <Row key={index} alignment="center">
            <Text modifiers={[weight(1)]}>{`${info.label}:`}</Text>
            <Text
              modifiers={[width(220)]}
              textStyle={{ fontWeight: "bold" }}
            >{`${info.value}`}</Text>
          </Row>
        ))}
      </Column>
    </BottomUtility>
  );
}
