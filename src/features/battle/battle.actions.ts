import type { Dispatch, SetStateAction } from "react";
import type { ActiveBattle, AppPage, Campaign, PreparedBattle } from "../../workspace.types";

export function createBattleActions({
  campaigns,
  selectedCampaignId,
  selectedActiveBattleId,
  setCampaigns,
  setSelectedCampaignId,
  setSelectedActiveBattleId,
  setCurrentBattle,
  setActivePage,
}: {
  campaigns: Campaign[];
  selectedCampaignId: string;
  selectedActiveBattleId: string;
  setCampaigns: Dispatch<SetStateAction<Campaign[]>>;
  setSelectedCampaignId: Dispatch<SetStateAction<string>>;
  setSelectedActiveBattleId: Dispatch<SetStateAction<string>>;
  setCurrentBattle: Dispatch<SetStateAction<import("../../workspace.types").CurrentBattle | null>>;
  setActivePage: Dispatch<SetStateAction<AppPage>>;
}) {
  function savePreparedBattle(campaignId: string, battle: PreparedBattle) {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === campaignId
          ? {
              ...campaign,
              preparedBattles: [
                ...campaign.preparedBattles.filter((item) => item.id !== battle.id),
                battle,
              ].sort(
                (a, b) => a.name.localeCompare(b.name),
              ),
            }
          : campaign,
      ),
    );
  }

  function deletePreparedBattle(campaignId: string, battleId: string) {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === campaignId
          ? {
              ...campaign,
              preparedBattles: campaign.preparedBattles.filter(
                (battle) => battle.id !== battleId,
              ),
            }
          : campaign,
      ),
    );
  }

  function saveActiveBattle(campaignId: string, activeBattle: ActiveBattle) {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === campaignId
          ? {
              ...campaign,
              activeBattles: [
                ...campaign.activeBattles.filter((battle) => battle.id !== activeBattle.id),
                activeBattle,
              ],
            }
          : campaign,
      ),
    );
  }

  function deleteActiveBattle(campaignId: string, battleId: string) {
    if (selectedCampaignId === campaignId && selectedActiveBattleId === battleId) {
      const nextBattle = campaigns
        .flatMap((campaign) =>
          campaign.activeBattles.map((battle) => ({
            campaignId: campaign.id,
            battle,
          })),
        )
        .find(({ campaignId: candidateCampaignId, battle }) =>
          candidateCampaignId !== campaignId || battle.id !== battleId,
        );
      setSelectedActiveBattleId(nextBattle?.battle.id ?? "");
      setSelectedCampaignId(nextBattle?.campaignId ?? selectedCampaignId);
      setActivePage(nextBattle ? "Current Battle" : "Battles");
    }
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === campaignId
          ? {
              ...campaign,
              activeBattles: campaign.activeBattles.filter(
                (battle) => battle.id !== battleId,
              ),
            }
          : campaign,
      ),
    );
  }

  function startActiveBattle(campaignId: string, battle: ActiveBattle) {
    saveActiveBattle(campaignId, battle);
    setCurrentBattle(null);
    setSelectedCampaignId(campaignId);
    setSelectedActiveBattleId(battle.id);
    setActivePage("Current Battle");
  }

  return {
    savePreparedBattle,
    deletePreparedBattle,
    saveActiveBattle,
    deleteActiveBattle,
    startActiveBattle,
  };
}
