import { useEffect, useState, type FormEvent } from "react";
import BattleEmptyState from "./battle-empty-state.component";
import CurrentBattleView from "./current-battle-view.component";
import BattleCreatorView from "./battle-creator-view.component";
import { createEnemyUnits, snapshotMonster } from "./battle.utils";
import {
  rollEnemyInitiatives,
  sortInitiative,
} from "./battle.utils";
import { castMonsterSpell, createSpellResources } from "../../shared/spells.utils";
import { createEmptyResourceNotes } from "../../shared/resource-notes.utils";
import useBattleResourceNavigation from "./battle-resource-navigation.hook";
import useDraftBattlePersistence from "./draft-battle-persistence.hook";
import type {
  ActiveBattle,
  ActiveEnemyParticipant,
  ActivePlayerParticipant,
  AppPage,
  Campaign,
  CurrentBattle,
  Monster,
  PreparedBattle,
  ResourceNavigation,
  ResourceNotes as ResourceNotesValue,
  ResourceOption,
} from "../../workspace.types";

interface BattlePageProps {
  mode: "creator" | "current";
  campaigns: Campaign[];
  monsters: Monster[];
  resources: ResourceOption[];
  selectedCampaignId: string;
  selectedActiveBattleId: string;
  currentBattle: CurrentBattle | null;
  onSelectCampaign: (id: string) => void;
  onNavigate: (page: AppPage) => void;
  onSavePreparedBattle: (campaignId: string, battle: PreparedBattle) => void;
  onDeletePreparedBattle: (campaignId: string, battleId: string) => void;
  onSaveActiveBattle: (campaignId: string, battle: ActiveBattle) => void;
  onDeleteActiveBattle: (campaignId: string, battleId: string) => void;
  onCreateActiveBattle: (campaignId: string, battle: ActiveBattle) => void;
  onSaveCurrentBattle: (battle: CurrentBattle | null) => void;
  resourceNavigation: ResourceNavigation | null;
  onOpenResource: (resource: ResourceNavigation["resource"]) => void;
  onFinishResourceNavigation: (requestId: string) => void;
}

type BattlePhase = "setup" | "initiative";

function BattlePage({
  mode,
  campaigns,
  monsters,
  resources,
  selectedCampaignId,
  selectedActiveBattleId,
  currentBattle,
  onSelectCampaign,
  onNavigate,
  onSavePreparedBattle,
  onDeletePreparedBattle,
  onSaveActiveBattle,
  onDeleteActiveBattle,
  onCreateActiveBattle,
  onSaveCurrentBattle,
  resourceNavigation,
  onOpenResource,
  onFinishResourceNavigation,
}: BattlePageProps) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(
    () => currentBattle?.setup?.playerIds ?? [],
  );
  const [enemyCounts, setEnemyCounts] = useState<Record<string, number>>(
    () => Object.fromEntries(
      currentBattle?.setup?.enemies.map((enemy) => [enemy.monsterId, enemy.count]) ?? [],
    ),
  );
  const [battleName, setBattleName] = useState(() => currentBattle?.name ?? "");
  const [battleNotes, setBattleNotes] = useState<ResourceNotesValue>(
    () => currentBattle?.setup?.notes ?? createEmptyResourceNotes(),
  );
  const [editingBattleId, setEditingBattleId] = useState("");
  const [playerInitiatives, setPlayerInitiatives] = useState<Record<string, string>>(
    () => currentBattle?.setup?.playerInitiatives ?? {},
  );
  const [phase, setPhase] = useState<BattlePhase>(
    () => currentBattle?.setup ? "initiative" : "setup",
  );
  const [isCreatingBattle, setIsCreatingBattle] = useState(
    () => Boolean(currentBattle?.setup),
  );
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  useBattleResourceNavigation({
    resourceNavigation,
    phase,
    setPhase,
    onSelectCampaign,
    onFinishResourceNavigation,
  });

  const selectedCampaign = campaigns.find(
    (campaign) => campaign.id === selectedCampaignId,
  );
  const selectedActiveBattle = selectedCampaign?.activeBattles.find(
    (battle) => battle.id === selectedActiveBattleId,
  );
  const selectedEnemyUnits = createEnemyUnits(monsters, enemyCounts);

  useDraftBattlePersistence({
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
  });

  useEffect(() => {
    if (!selectedCampaign && campaigns.length > 0) {
      onSelectCampaign(campaigns[0].id);
    }
  }, [campaigns, onSelectCampaign, selectedCampaign]);

  function changeCampaign(campaignId: string) {
    onSelectCampaign(campaignId);
    setSelectedPlayerIds([]);
    setEnemyCounts({});
    setBattleName("");
    setBattleNotes(createEmptyResourceNotes());
    setEditingBattleId("");
    setPlayerInitiatives({});
    setPhase("setup");
    setError("");
    setSaveMessage("");
  }

  function togglePlayer(playerId: string, checked: boolean) {
    setSelectedPlayerIds((current) =>
      checked
        ? [...current, playerId]
        : current.filter((id) => id !== playerId),
    );
    setError("");
    setSaveMessage("");
  }

  function setEnemyCount(monsterId: string, count: number) {
    setEnemyCounts((current) => ({ ...current, [monsterId]: count }));
    setError("");
    setSaveMessage("");
  }

  function savePreparedEncounter() {
    if (!selectedCampaign) {
      setError("Select a campaign before saving a battle.");
      return;
    }
    if (!battleName.trim()) {
      setError("Give this battle a name before saving it.");
      return;
    }
    if (selectedPlayerIds.length === 0) {
      setError("Select at least one player before saving this battle.");
      return;
    }

    const enemies = Object.entries(enemyCounts)
      .filter(([monsterId, count]) => count > 0 && monsters.some((monster) => monster.id === monsterId))
      .map(([monsterId, count]) => ({ monsterId, count }));
    if (enemies.length === 0) {
      setError("Add at least one enemy before saving this battle.");
      return;
    }

    const battleId = editingBattleId || crypto.randomUUID();
    onSavePreparedBattle(selectedCampaign.id, {
      id: battleId,
      name: battleName.trim(),
      playerIds: [...selectedPlayerIds],
      enemies,
      notes: battleNotes,
    });
    setError("");
    setSaveMessage(`“${battleName.trim()}” saved under ${selectedCampaign.name}.`);
    setEditingBattleId(battleId);
  }

  function loadPreparedEncounter(battle: PreparedBattle) {
    const missingPlayer = battle.playerIds.some(
      (id) => !selectedCampaign?.players.some((player) => player.id === id),
    );
    const missingMonster = battle.enemies.some(
      (enemy) => !monsters.some((monster) => monster.id === enemy.monsterId),
    );
    if (missingPlayer || missingMonster) {
      setError(
        "This saved battle references a player or monster that is no longer available. Update the campaign or compendium first.",
      );
      return;
    }

    setBattleName(battle.name);
    setBattleNotes(battle.notes);
    setEditingBattleId(battle.id);
    setSelectedPlayerIds(battle.playerIds);
    setEnemyCounts(
      Object.fromEntries(
        battle.enemies.map((enemy) => [enemy.monsterId, enemy.count]),
      ),
    );
    setPhase("setup");
    setIsCreatingBattle(true);
    setError("");
    setSaveMessage("");
  }

  function closeBattleForm() {
    setIsCreatingBattle(false);
    setSelectedPlayerIds([]);
    setEnemyCounts({});
    setBattleName("");
    setBattleNotes(createEmptyResourceNotes());
    setEditingBattleId("");
    setPlayerInitiatives({});
    setPhase("setup");
    setError("");
    setSaveMessage("");
    onSaveCurrentBattle(null);
  }

  function deletePreparedEncounter(battle: PreparedBattle) {
    if (
      selectedCampaign &&
      window.confirm(`Delete the saved battle "${battle.name}"?`)
    ) {
      onDeletePreparedBattle(selectedCampaign.id, battle.id);
      if (editingBattleId === battle.id) setEditingBattleId("");
    }
  }

  function prepareInitiative(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedPlayerIds.length === 0) {
      setError("Select at least one player for the battle.");
      return;
    }
    if (!monsters.some((monster) => (enemyCounts[monster.id] ?? 0) > 0)) {
      setError("Add at least one enemy from the compendium.");
      return;
    }

    setPlayerInitiatives(
      Object.fromEntries(selectedPlayerIds.map((id) => [id, ""])),
    );
    setPhase("initiative");
    setError("");
  }

  function startBattle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCampaign) {
      setError("Select a campaign before starting a battle.");
      return;
    }

    const players = selectedCampaign.players.filter((player) =>
      selectedPlayerIds.includes(player.id),
    );
    const invalidPlayer = players.find((player) => {
      const value = playerInitiatives[player.id];
      return value === undefined || value.trim() === "" || !Number.isInteger(Number(value));
    });
    if (invalidPlayer) {
      setError(`Enter a whole-number initiative for ${invalidPlayer.name}.`);
      return;
    }

    const playerParticipants: ActivePlayerParticipant[] = players.map((player) => ({
      id: player.id,
      name: player.name,
      kind: "player",
      initiative: Number(playerInitiatives[player.id]),
      dexterityModifier: 0,
      playerId: player.id,
      monster: null,
    }));

    const enemyUnits = selectedEnemyUnits.map((enemy) => ({
      ...enemy,
      id: crypto.randomUUID(),
    }));
    const enemyParticipants: ActiveEnemyParticipant[] = rollEnemyInitiatives(enemyUnits)
      .map((participant, index) => {
        const monster = monsters.find((item) => item.id === enemyUnits[index].monsterId);
        if (!monster) {
          throw new Error("An enemy in the encounter is no longer available.");
        }
        return {
          ...participant,
          kind: "enemy",
          playerId: null,
          monster: snapshotMonster(monster),
          currentHitPoints: monster.hitPoints,
          maxHitPoints: monster.hitPoints,
          ...createSpellResources(monster),
        };
      });
    const participants = sortInitiative([...playerParticipants, ...enemyParticipants]);
    onCreateActiveBattle(selectedCampaign.id, {
      id: crypto.randomUUID(),
      name: battleName.trim() || "Battle encounter",
      round: 1,
      currentParticipantId: participants[0].id,
      participants,
    });
    onSaveCurrentBattle(null);
    setError("");
  }


  if (mode === "current" && (!selectedCampaign || !selectedActiveBattle)) {
    return (
      <BattleEmptyState mode={mode} kind="inactive" onNavigate={onNavigate} />
    );
  }

  if (campaigns.length === 0) {
    return (
      <BattleEmptyState mode={mode} kind="no-campaigns" onNavigate={onNavigate} />
    );
  }

  if (mode === "current" && selectedCampaign && selectedActiveBattle) {
    return (
      <CurrentBattleView
        campaign={selectedCampaign}
        battle={selectedActiveBattle}
        monsters={monsters}
        error={error}
        setError={setError}
        onSaveActiveBattle={onSaveActiveBattle}
        onDeleteActiveBattle={onDeleteActiveBattle}
      />
    );
  }


  return (
    <BattleCreatorView
      campaigns={campaigns}
      monsters={monsters}
      resources={resources}
      selectedCampaign={selectedCampaign}
      selectedPlayerIds={selectedPlayerIds}
      setSelectedPlayerIds={setSelectedPlayerIds}
      enemyCounts={enemyCounts}
      setEnemyCounts={setEnemyCounts}
      battleName={battleName}
      setBattleName={setBattleName}
      battleNotes={battleNotes}
      setBattleNotes={setBattleNotes}
      editingBattleId={editingBattleId}
      playerInitiatives={playerInitiatives}
      setPlayerInitiatives={setPlayerInitiatives}
      phase={phase}
      setPhase={setPhase}
      isCreatingBattle={isCreatingBattle}
      setIsCreatingBattle={setIsCreatingBattle}
      error={error}
      saveMessage={saveMessage}
      selectedEnemyUnits={selectedEnemyUnits}
      onNavigate={onNavigate}
      onClearMessages={() => {
        setSaveMessage("");
        setError("");
      }}
      onOpenResource={onOpenResource}
      onChangeCampaign={changeCampaign}
      onTogglePlayer={togglePlayer}
      onSetEnemyCount={setEnemyCount}
      onSavePreparedEncounter={savePreparedEncounter}
      onPrepareInitiative={prepareInitiative}
      onStartBattle={startBattle}
      onCloseBattleForm={closeBattleForm}
      onLoadPreparedEncounter={loadPreparedEncounter}
      onDeletePreparedEncounter={deletePreparedEncounter}
    />
  );
}

export default BattlePage;
