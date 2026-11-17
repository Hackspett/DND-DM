import { useCallback, useEffect, useState } from "react";
import AppButton from "./shared/app-button.component";
import WorkspaceShell from "./features/workspace/workspace-shell.component";
import { createBattleActions } from "./features/battle/battle.actions";
import { createCampaignActions } from "./features/campaigns/campaigns.actions";
import { createCompendiumActions } from "./features/compendium/compendium.actions";
import { formatDiceExpression } from "./shared/dice.utils";
import { createEmptyResourceNotes } from "./shared/resource-notes.utils";
import { loadWorkspace, saveWorkspace } from "./workspace-storage.service";
import type {
  ActiveBattle,
  AppPage,
  Campaign,
  CompendiumCategory,
  CompendiumEntry,
  CurrentBattle,
  GearEntry,
  LocationNode,
  Monster,
  Npc,
  Player,
  PreparedBattle,
  ResourceLink,
  ResourceNavigation,
  ResourceNotes,
  ResourceOption,
  ResourcePreview,
  ResourceType,
} from "./workspace.types";

function getLocationPath(campaign: Campaign, location: LocationNode): string {
  const parts = [location.name];
  let parentId = location.parentId;
  while (parentId) {
    const parent = campaign.locations.find((item) => item.id === parentId);
    if (!parent) break;
    parts.unshift(parent.name);
    parentId = parent.parentId;
  }
  return parts.join(" / ");
}

function createResourcePreview(
  notes: ResourceNotes,
  subtitle: string,
  details: string[] = [],
  profileImageId: string | null = null,
): ResourcePreview {
  return {
    subtitle,
    details,
    description: notes.text.trim(),
    imageId: profileImageId ?? notes.images[0]?.id ?? null,
  };
}

function App() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [items, setItems] = useState<CompendiumEntry[]>([]);
  const [gear, setGear] = useState<GearEntry[]>([]);
  const [effects, setEffects] = useState<CompendiumEntry[]>([]);
  const [currentBattle, setCurrentBattle] = useState<CurrentBattle | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedActiveBattleId, setSelectedActiveBattleId] = useState("");
  const [activePage, setActivePage] = useState<AppPage>("Overview");
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const [resourceNavigation, setResourceNavigation] = useState<ResourceNavigation | null>(null);
  const campaignActions = createCampaignActions({
    campaigns,
    currentBattle,
    selectedCampaignId,
    setCampaigns,
    setCurrentBattle,
    setSelectedCampaignId,
    setSelectedActiveBattleId,
  });
  const compendiumActions = createCompendiumActions({ setMonsters, setItems, setGear, setEffects });
  const battleActions = createBattleActions({
    campaigns,
    selectedCampaignId,
    selectedActiveBattleId,
    setCampaigns,
    setSelectedCampaignId,
    setSelectedActiveBattleId,
    setCurrentBattle,
    setActivePage,
  });

  const saveCurrentBattle = useCallback(
    (battle: CurrentBattle | null) => setCurrentBattle(battle),
    [],
  );

  const resources: ResourceOption[] = [
    ...campaigns.map((campaign) => ({
      type: "campaign" as const,
      id: campaign.id,
      campaignId: campaign.id,
      label: campaign.name,
      context: campaign.name,
      preview: createResourcePreview(campaign.notes, "Campaign"),
    })),
    ...campaigns.flatMap((campaign) => [
      ...campaign.players.map((player) => ({
        type: "player" as const,
        id: player.id,
        campaignId: campaign.id,
        label: player.name,
        context: `${campaign.name} / ${player.name}`,
        preview: createResourcePreview(
          player.notes,
          `Player · ${campaign.name}`,
          [],
          player.profileImageId,
        ),
      })),
      ...campaign.npcs.map((npc) => ({
        type: "npc" as const,
        id: npc.id,
        campaignId: campaign.id,
        label: npc.name,
        context: `${campaign.name} / ${npc.name}`,
        preview: createResourcePreview(
          npc.notes,
          npc.stats
            ? `${npc.stats.creatureType} · AC ${npc.stats.armorClass} · ${npc.stats.hitPoints} HP`
            : `NPC · ${campaign.name}`,
          npc.stats && npc.stats.skills ? [`Skills: ${npc.stats.skills}`] : [],
          npc.profileImageId,
        ),
      })),
      ...campaign.locations.map((location) => ({
        type: "location" as const,
        id: location.id,
        campaignId: campaign.id,
        label: location.name,
        context: `${campaign.name} / ${getLocationPath(campaign, location)}${location.kind === "folder" ? " (folder)" : ""}`,
        preview: createResourcePreview(
          location.notes,
          location.kind === "folder" ? "Location folder" : "Location",
        ),
      })),
      ...campaign.preparedBattles.map((battle) => ({
        type: "battle" as const,
        id: battle.id,
        campaignId: campaign.id,
        label: battle.name,
        context: `${campaign.name} / ${battle.name}`,
        preview: createResourcePreview(
          battle.notes,
          "Saved battle",
          [
            `${battle.playerIds.length} ${battle.playerIds.length === 1 ? "player" : "players"}`,
            `${battle.enemies.reduce((count, enemy) => count + enemy.count, 0)} enemies`,
          ],
        ),
      })),
    ]),
    ...monsters.map((monster) => ({
      type: "monster" as const,
      id: monster.id,
      campaignId: null,
      label: monster.name,
      context: monster.name,
      preview: createResourcePreview(
        monster.notes,
        `${monster.size} ${monster.creatureType} · CR ${monster.challengeRating || "—"}`,
        [
          `AC ${monster.armorClass}`,
          `${monster.hitPoints} HP`,
          monster.speed ? `Speed ${monster.speed}` : "",
        ].filter(Boolean),
        monster.profileImageId,
      ),
    })),
    ...items.map((item) => ({
      type: "item" as const,
      id: item.id,
      campaignId: null,
      label: item.name,
      context: item.name,
      preview: createResourcePreview(item.notes, "Item"),
    })),
    ...gear.map((entry) => ({
      type: "gear" as const,
      id: entry.id,
      campaignId: null,
      label: entry.name,
      context: entry.name,
      preview: createResourcePreview(
        entry.notes,
        entry.kind === "weapon" ? "Weapon" : "Armor",
        [
          `Cost ${entry.cost}`,
          ...(entry.kind === "weapon"
            ? [
                `Damage ${formatDiceExpression(entry.damage)} ${entry.damageType}`,
                `Range ${entry.range.normal}/${entry.range.long} ft`,
              ]
            : [`AC ${entry.armorClass}`]),
        ],
      ),
    })),
    ...effects.map((effect) => ({
      type: "effect" as const,
      id: effect.id,
      campaignId: null,
      label: effect.name,
      context: effect.name,
      preview: createResourcePreview(effect.notes, "Effect"),
    })),
  ];

  const reloadWorkspace = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const workspace = await loadWorkspace();
      setCampaigns(workspace.campaigns);
      setMonsters(workspace.monsters);
      setItems(workspace.items);
      setGear(workspace.gear);
      setEffects(workspace.effects);
      const currentBattleDraft = workspace.currentBattle?.setup
        ? workspace.currentBattle
        : null;
      setCurrentBattle(currentBattleDraft);
      const firstActiveBattle = workspace.campaigns
        .flatMap((campaign) =>
          campaign.activeBattles.map((battle) => ({
            campaignId: campaign.id,
            battle,
          })),
        )[0];
      setSelectedActiveBattleId(firstActiveBattle?.battle.id ?? "");
      setSelectedCampaignId(
        currentBattleDraft?.campaignId ??
          firstActiveBattle?.campaignId ??
          workspace.campaigns[0]?.id ??
          "",
      );
      setHasLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown API error";
      console.error("Could not load the workspace from the local database.", error);
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadWorkspace();
  }, [reloadWorkspace]);

  useEffect(() => {
    if (!campaigns.some((campaign) => campaign.id === selectedCampaignId)) {
      setSelectedCampaignId(campaigns[0]?.id ?? "");
    }
  }, [campaigns, selectedCampaignId]);

  useEffect(() => {
    if (!hasLoaded) return;
    let active = true;
    setIsSaving(true);
    void saveWorkspace({ campaigns, monsters, items, gear, effects, currentBattle })
      .then(() => {
        if (active) setSaveError("");
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unknown API error";
        console.error("Could not save the workspace to the local database.", error);
        if (active) setSaveError(message);
      })
      .finally(() => {
        if (active) setIsSaving(false);
      });
    return () => {
      active = false;
    };
  }, [campaigns, currentBattle, effects, gear, hasLoaded, items, monsters, saveAttempt]);

  function openResource(resource: ResourceLink) {
    const pageForType: Record<ResourceType, AppPage> = {
      campaign: "Campaigns",
      player: "Campaigns",
      npc: "Campaigns",
      location: "Campaigns",
      battle: "Battles",
      monster: "Compendium",
      item: "Compendium",
      gear: "Compendium",
      effect: "Compendium",
    };
    if (resource.campaignId) {
      setSelectedCampaignId(resource.campaignId);
    }
    setResourceNavigation({
      resource,
      requestId: crypto.randomUUID(),
    });
    setActivePage(pageForType[resource.type]);
  }

  function finishResourceNavigation(requestId: string) {
    setResourceNavigation((current) =>
      current?.requestId === requestId ? null : current,
    );
  }

  if (!hasLoaded) {
    return (
      <DatabaseStatus
        isLoading={isLoading}
        error={loadError}
        onRetry={() => void reloadWorkspace()}
      />
    );
  }

  return (
    <WorkspaceShell
      campaigns={campaigns}
      monsters={monsters}
      items={items}
      gear={gear}
      effects={effects}
      currentBattle={currentBattle}
      saveCurrentBattle={saveCurrentBattle}
      selectedCampaignId={selectedCampaignId}
      selectedActiveBattleId={selectedActiveBattleId}
      activePage={activePage}
      setActivePage={setActivePage}
      setSelectedCampaignId={setSelectedCampaignId}
      setSelectedActiveBattleId={setSelectedActiveBattleId}
      resources={resources}
      resourceNavigation={resourceNavigation}
      isSaving={isSaving}
      saveError={saveError}
      setSaveAttempt={setSaveAttempt}
      openResource={openResource}
      finishResourceNavigation={finishResourceNavigation}
      campaignActions={campaignActions}
      compendiumActions={compendiumActions}
      battleActions={battleActions}
    />
  );
}

function DatabaseStatus({
  isLoading,
  error,
  onRetry,
}: {
  isLoading: boolean;
  error: string;
  onRetry: () => void;
}) {
  return (
    <main className="database-status">
      <span className="brand-mark">✳</span>
      <h1>hearthside</h1>
      {isLoading ? (
        <p>Connecting to your local SQLite database…</p>
      ) : (
        <>
          <p>Could not connect to the local database.</p>
          <small>{error}</small>
          <p className="database-status-hint">Start the app with <code>npm run dev</code>, then try again.</p>
          <AppButton className="primary-button" type="button" onClick={onRetry}>Retry connection</AppButton>
        </>
      )}
    </main>
  );
}

export default App;
