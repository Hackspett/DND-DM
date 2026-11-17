import { useState, type Dispatch, type SetStateAction } from "react";
import { addParticipantsToBattle, rollEnemyInitiatives } from "./battle.utils";
import { castMonsterSpell, createSpellResources } from "../../shared/spells.utils";
import { NativeSelect, NumberInput } from "@mantine/core";
import AppButton from "../../shared/app-button.component";
import type {
  ActiveBattle,
  ActiveEnemyParticipant,
  ActivePlayerParticipant,
  Campaign,
  Monster,
} from "../../workspace.types";
import PageHeading from "./battle-page-heading.component";
import { snapshotMonster } from "./battle.utils";
import BattleParticipantList from "./battle-participant-list.component";

interface CurrentBattleViewProps {
  campaign: Campaign;
  battle: ActiveBattle;
  monsters: Monster[];
  error: string;
  setError: Dispatch<SetStateAction<string>>;
  onSaveActiveBattle: (campaignId: string, battle: ActiveBattle) => void;
  onDeleteActiveBattle: (campaignId: string, battleId: string) => void;
}

export default function CurrentBattleView({
  campaign,
  battle,
  monsters,
  error,
  setError,
  onSaveActiveBattle,
  onDeleteActiveBattle,
}: CurrentBattleViewProps) {
  const [showAddCombatants, setShowAddCombatants] = useState(false);
  const [playerToAdd, setPlayerToAdd] = useState("");
  const [playerInitiativeToAdd, setPlayerInitiativeToAdd] = useState("");
  const [monsterToAdd, setMonsterToAdd] = useState("");
  const [enemyCountToAdd, setEnemyCountToAdd] = useState(1);

  function advanceTurn() {
    if (!campaign || !battle) return;
    const currentIndex = battle.participants.findIndex(
      (participant) => participant.id === battle.currentParticipantId,
    );
    const nextIndex = (currentIndex + 1) % battle.participants.length;
    onSaveActiveBattle(campaign.id, {
      ...battle,
      round: nextIndex === 0 ? battle.round + 1 : battle.round,
      currentParticipantId: battle.participants[nextIndex].id,
    });
  }

  function endBattle() {
    if (campaign && battle) {
      onDeleteActiveBattle(campaign.id, battle.id);
    }
    setError("");
  }

  function addPlayerToActiveBattle() {
    const player = campaign?.players.find((item) => item.id === playerToAdd);
    const initiative = playerInitiativeToAdd.trim();
    if (!campaign || !battle || !player) {
      setError("Choose a player to add.");
      return;
    }
    if (initiative === "" || !Number.isInteger(Number(initiative))) {
      setError(`Enter a whole-number initiative for ${player.name}.`);
      return;
    }

    const participant: ActivePlayerParticipant = {
      id: crypto.randomUUID(),
      name: player.name,
      kind: "player",
      initiative: Number(initiative),
      dexterityModifier: 0,
      playerId: player.id,
      monster: null,
    };
    onSaveActiveBattle(
      campaign.id,
      addParticipantsToBattle(battle, [participant]),
    );
    setPlayerToAdd("");
    setPlayerInitiativeToAdd("");
    setError("");
  }

  function addEnemiesToActiveBattle() {
    const monster = monsters.find((item) => item.id === monsterToAdd);
    if (!campaign || !battle || !monster) {
      setError("Choose a monster to add.");
      return;
    }
    if (!Number.isInteger(enemyCountToAdd) || enemyCountToAdd < 1 || enemyCountToAdd > 20) {
      setError("Enemy count must be between 1 and 20.");
      return;
    }

    const existingCount = battle.participants.filter(
      (participant) => participant.kind === "enemy" && participant.monster.id === monster.id,
    ).length;
    const totalCount = existingCount + enemyCountToAdd;
    const enemies = Array.from({ length: enemyCountToAdd }, (_, index) => ({
      id: crypto.randomUUID(),
      name: totalCount > 1 ? `${monster.name} ${existingCount + index + 1}` : monster.name,
      dexterityScore: monster.abilityScores.DEX,
    }));
    const additions: ActiveEnemyParticipant[] = rollEnemyInitiatives(enemies).map((participant) => ({
      ...participant,
      kind: "enemy",
      playerId: null,
      monster: snapshotMonster(monster),
      currentHitPoints: monster.hitPoints,
      maxHitPoints: monster.hitPoints,
      ...createSpellResources(monster),
    }));

    onSaveActiveBattle(
      campaign.id,
      addParticipantsToBattle(battle, additions),
    );
    setEnemyCountToAdd(1);
    setError("");
  }

  function updateEnemyHitPoints(participantId: string, currentHitPoints: number) {
    if (!campaign || !battle) return;
    onSaveActiveBattle(campaign.id, {
      ...battle,
      participants: battle.participants.map((participant) =>
        participant.kind === "enemy" && participant.id === participantId
          ? {
              ...participant,
              currentHitPoints: Math.max(0, Math.min(
                participant.maxHitPoints,
                Math.trunc(currentHitPoints),
              )),
            }
          : participant,
      ),
    });
  }

  function updateEnemySpellSlots(
    participantId: string,
    level: number,
    remaining: number,
  ) {
    if (!campaign || !battle) return;
    onSaveActiveBattle(campaign.id, {
      ...battle,
      participants: battle.participants.map((participant) =>
        participant.kind === "enemy" && participant.id === participantId
          ? {
              ...participant,
              spellSlots: participant.spellSlots.map((slot) =>
                slot.level === level
                  ? { ...slot, remaining: Math.max(0, Math.min(slot.maximum, Math.trunc(remaining))) }
                  : slot,
              ),
            }
          : participant,
      ),
    });
  }

  function castEnemySpell(participantId: string, spellId: string) {
    if (!campaign || !battle) return;
    onSaveActiveBattle(campaign.id, {
      ...battle,
      participants: battle.participants.map((participant) => {
        if (participant.kind !== "enemy" || participant.id !== participantId) {
          return participant;
        }
        const spell = participant.monster.spells.find((item) => item.id === spellId);
        return spell ? castMonsterSpell(participant, spell) : participant;
      }),
    });
  }


    const activeParticipant = battle.participants.find(
      (participant) => participant.id === battle.currentParticipantId,
    );
    const availablePlayers = campaign.players.filter(
      (player) => !battle.participants.some(
        (participant) => participant.kind === "player" && participant.playerId === player.id,
      ),
    );
    return (
      <section className="workspace-page">
        <PageHeading mode="current" />
        <div className="battle-live-header card">
          <div>
            <p className="eyebrow">ENCOUNTER IN PROGRESS · {campaign?.name}</p>
            <h2>{battle.name}</h2>
            <p className="page-lede">Round {battle.round} · {battle.participants.length} combatants</p>
          </div>
          <div className="battle-live-actions">
            <AppButton className="secondary-button" type="button" onClick={advanceTurn}>Next turn →</AppButton>
            <AppButton
              className="secondary-button"
              type="button"
              onClick={() => setShowAddCombatants((current) => !current)}
            >
              {showAddCombatants ? "Close" : "＋ Add combatants"}
            </AppButton>
            <AppButton className="danger-text-button" type="button" onClick={endBattle}>End battle</AppButton>
          </div>
        </div>
        {showAddCombatants && (
          <div className="live-add-combatants card">
            <form
              className="live-add-combatant-form"
              onSubmit={(event) => {
                event.preventDefault();
                addPlayerToActiveBattle();
              }}
            >
              <h3>Add player</h3>
              <NativeSelect
                className="form-field"
                label="Player"
                value={playerToAdd}
                onChange={(event) => setPlayerToAdd(event.currentTarget.value)}
                required
                disabled={availablePlayers.length === 0}
              >
                  <option value="">Choose a player</option>
                  {availablePlayers.map((player) => (
                    <option value={player.id} key={player.id}>{player.name}</option>
                  ))}
              </NativeSelect>
              <NumberInput
                className="form-field"
                label="Manual initiative"
                step={1}
                value={playerInitiativeToAdd}
                onChange={(value) => setPlayerInitiativeToAdd(String(value))}
                required
              />
              <AppButton className="primary-button" type="submit" disabled={availablePlayers.length === 0}>
                Add player
              </AppButton>
            </form>
            <form
              className="live-add-combatant-form"
              onSubmit={(event) => {
                event.preventDefault();
                addEnemiesToActiveBattle();
              }}
            >
              <h3>Add enemies</h3>
              <NativeSelect
                className="form-field"
                label="Monster"
                value={monsterToAdd}
                onChange={(event) => setMonsterToAdd(event.currentTarget.value)}
                required
                disabled={monsters.length === 0}
              >
                  <option value="">Choose a monster</option>
                  {monsters.map((monster) => (
                    <option value={monster.id} key={monster.id}>{monster.name}</option>
                  ))}
              </NativeSelect>
              <NumberInput
                className="form-field"
                label="Count"
                min={1}
                max={20}
                step={1}
                value={enemyCountToAdd}
                onChange={(value) => setEnemyCountToAdd(Number(value) || 1)}
                required
              />
              <AppButton className="primary-button" type="submit" disabled={monsters.length === 0}>
                Roll initiative &amp; add
              </AppButton>
            </form>
          </div>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <BattleParticipantList
          battle={battle}
          onUpdateEnemyHitPoints={updateEnemyHitPoints}
          onUpdateEnemySpellSlots={updateEnemySpellSlots}
          onCastEnemySpell={castEnemySpell}
        />
      </section>
    );
}
