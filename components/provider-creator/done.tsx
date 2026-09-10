import { useProviderCreator } from "@/utils/provider-creator.utils";
import { Column, Row, Text } from "@expo/ui";
import { weight } from "@expo/ui/jetpack-compose/modifiers";
import BottomUtility from "./bottom-utility";

export default function Done() {
  const ctx = useProviderCreator();
  if (!ctx) return null;

  const { providerDraft } = ctx;

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
    >
      <Column alignment="start" spacing={8}>
        {infos.map((info, index) => (
          <Row key={index}>
            <Text modifiers={[weight(1)]}>{`${info.label}:`}</Text>
            <Text textStyle={{ fontWeight: "bold" }}>{`${info.value}`}</Text>
          </Row>
        ))}
      </Column>
    </BottomUtility>
  );
}
