import { useEffect } from "react";
import type { Campaign, CurrentBattle, Monster, ResourceNotes } from "../../workspace.types";

export default function useDraftBattlePersistence({
  mode,
  phase,
  selectedCampaign,
  battleName,
  selectedPlayerIds,
  enemyCounts,
  monsters,
  battleNotes,
  playerInitiatives,
  onSaveCurrentBattle,
}: {
  mode: "creator" | "current";
  phase: "setup" | "initiative";
  selectedCampaign: Campaign | undefined;
  battleName: string;
  selectedPlayerIds: string[];
  enemyCounts: Record<string, number>;
  monsters: Monster[];
  battleNotes: ResourceNotes;
  playerInitiatives: Record<string, string>;
  onSaveCurrentBattle: (battle: CurrentBattle | null) => void;
}) {
  useEffect(() => {
    if (mode !== "creator" || phase !== "initiative" || !selectedCampaign) {
      return;
    }
    onSaveCurrentBattle({
      campaignId: selectedCampaign.id,
      name: battleName,
      setup: {
        playerIds: [...selectedPlayerIds],
        enemies: Object.entries(enemyCounts)
          .filter(([monsterId, count]) =>
            count > 0 && monsters.some((monster) => monster.id === monsterId),
          )
          .map(([monsterId, count]) => ({ monsterId, count })),
        notes: battleNotes,
        playerInitiatives: { ...playerInitiatives },
      },
    });
  }, [
    battleName,
    battleNotes,
    enemyCounts,
    mode,
    monsters,
    onSaveCurrentBattle,
    phase,
    playerInitiatives,
    selectedCampaign,
    selectedPlayerIds,
  ]);
}
