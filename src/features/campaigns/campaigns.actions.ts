import type { Campaign, CurrentBattle, LocationNode, Npc, Player, ResourceNotes } from "../../workspace.types";
import type { Dispatch, SetStateAction } from "react";
import { createEmptyResourceNotes } from "../../shared/resource-notes.utils";

export function createCampaignActions({
  campaigns,
  currentBattle,
  selectedCampaignId,
  setCampaigns,
  setCurrentBattle,
  setSelectedCampaignId,
  setSelectedActiveBattleId,
}: {
  campaigns: Campaign[];
  currentBattle: CurrentBattle | null;
  selectedCampaignId: string;
  setCampaigns: Dispatch<SetStateAction<Campaign[]>>;
  setCurrentBattle: Dispatch<SetStateAction<CurrentBattle | null>>;
  setSelectedCampaignId: Dispatch<SetStateAction<string>>;
  setSelectedActiveBattleId: Dispatch<SetStateAction<string>>;
}) {
  function createCampaign(name: string): Campaign {
    const campaign: Campaign = {
      id: crypto.randomUUID(),
      name,
      notes: createEmptyResourceNotes(),
      players: [],
      preparedBattles: [],
      activeBattles: [],
      npcs: [],
      locations: [],
    };
    setCampaigns((current) =>
      [...current, campaign].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setSelectedCampaignId(campaign.id);
    return campaign;
  }

  function addPlayer(campaignId: string, player: Player) {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === campaignId
          ? {
              ...campaign,
              players: [...campaign.players, player].sort((a, b) =>
                a.name.localeCompare(b.name),
              ),
            }
          : campaign,
      ),
    );
  }

  function updateCampaignNotes(campaignId: string, notes: ResourceNotes) {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === campaignId ? { ...campaign, notes } : campaign,
      ),
    );
  }

  function updatePlayerNotes(
    campaignId: string,
    playerId: string,
    notes: ResourceNotes,
  ) {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === campaignId
          ? {
              ...campaign,
              players: campaign.players.map((player) =>
                player.id === playerId ? { ...player, notes } : player,
              ),
            }
          : campaign,
      ),
    );
  }

  function updatePlayerProfileImage(
    campaignId: string,
    playerId: string,
    profileImageId: string | null,
  ) {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === campaignId
          ? {
              ...campaign,
              players: campaign.players.map((player) =>
                player.id === playerId ? { ...player, profileImageId } : player,
              ),
            }
          : campaign,
      ),
    );
  }

  function removePlayer(campaignId: string, playerId: string) {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === campaignId
          ? {
              ...campaign,
              players: campaign.players.filter((player) => player.id !== playerId),
            }
          : campaign,
      ),
    );
  }

  function saveNpc(campaignId: string, npc: Npc) {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === campaignId
          ? {
              ...campaign,
              npcs: [...campaign.npcs.filter((item) => item.id !== npc.id), npc].sort(
                (a, b) => a.name.localeCompare(b.name),
              ),
            }
          : campaign,
      ),
    );
  }

  function deleteNpc(campaignId: string, npcId: string) {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === campaignId
          ? { ...campaign, npcs: campaign.npcs.filter((npc) => npc.id !== npcId) }
          : campaign,
      ),
    );
  }

  function saveLocation(campaignId: string, location: LocationNode) {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === campaignId
          ? {
              ...campaign,
              locations: [
                ...campaign.locations.filter((item) => item.id !== location.id),
                location,
              ].sort((a, b) => a.name.localeCompare(b.name)),
            }
          : campaign,
      ),
    );
  }

  function deleteLocation(campaignId: string, locationId: string) {
    setCampaigns((current) =>
      current.map((campaign) => {
        if (campaign.id !== campaignId) return campaign;

        const deletedIds = new Set([locationId]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const location of campaign.locations) {
            if (location.parentId && deletedIds.has(location.parentId) && !deletedIds.has(location.id)) {
              deletedIds.add(location.id);
              changed = true;
            }
          }
        }
        return {
          ...campaign,
          locations: campaign.locations.filter((location) => !deletedIds.has(location.id)),
        };
      }),
    );
  }

  function deleteCampaign(campaignId: string) {
    const campaign = campaigns.find((item) => item.id === campaignId);
    if (!campaign || !window.confirm(`Delete the campaign "${campaign.name}" and all of its players, NPCs, locations, and prepared battles?`)) {
      return;
    }

    const remaining = campaigns.filter((item) => item.id !== campaignId);
    const nextActiveBattle = remaining.flatMap((item) =>
      item.activeBattles.map((battle) => ({
        campaignId: item.id,
        battle,
      })),
    )[0];
    setCampaigns(remaining);
    if (currentBattle?.campaignId === campaignId) setCurrentBattle(null);
    if (selectedCampaignId === campaignId) {
      setSelectedCampaignId(nextActiveBattle?.campaignId ?? remaining[0]?.id ?? "");
      setSelectedActiveBattleId(nextActiveBattle?.battle.id ?? "");
    }
  }

  return {
    createCampaign,
    addPlayer,
    updateCampaignNotes,
    updatePlayerNotes,
    updatePlayerProfileImage,
    removePlayer,
    saveNpc,
    deleteNpc,
    saveLocation,
    deleteLocation,
    deleteCampaign,
  };
}
