import { Box, Text, Title } from "@mantine/core";

export default function BattlePageHeading({
  mode,
}: {
  mode: "creator" | "current";
}) {
  const isCreator = mode === "creator";
  return (
    <Box className="page-title-row">
      <Box>
        <Text className="eyebrow">{isCreator ? "ROLL FOR INITIATIVE" : "ENCOUNTERS IN PROGRESS"}</Text>
        <Title order={1}>{isCreator ? "Battles" : "Current Battle"}</Title>
        <Text className="page-lede">
          {isCreator
            ? "Build an encounter and get it ready to run."
            : "Track initiative and combat for this encounter."}
        </Text>
      </Box>
    </Box>
  );
}
