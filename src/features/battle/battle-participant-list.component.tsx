import { Accordion } from "@mantine/core";
import AppButton from "../../shared/app-button.component";
import { canCastMonsterSpell, spellUsageLabel } from "../../shared/spells.utils";
import ProfileAvatar from "../../shared/profile-avatar.component";
import CreatureStatBlock from "../../shared/creature-stat-block.component";
import type { ActiveBattle } from "../../workspace.types";
import BattleNumberInput from "./battle-number-input.component";
import {
  formatMovementInSquares,
  formatModifier,
  getSpellResourceStatus,
  spellLevelLabel,
} from "./battle.utils";

export default function BattleParticipantList({
  battle,
  onUpdateEnemyHitPoints,
  onUpdateEnemySpellSlots,
  onCastEnemySpell,
}: {
  battle: ActiveBattle;
  onUpdateEnemyHitPoints: (participantId: string, currentHitPoints: number) => void;
  onUpdateEnemySpellSlots: (participantId: string, level: number, remaining: number) => void;
  onCastEnemySpell: (participantId: string, spellId: string) => void;
}) {
  const activeParticipant = battle.participants.find(
    (participant) => participant.id === battle.currentParticipantId,
  );
  return (
    <>
        <div className="turn-list">
          {battle.participants.map((participant, index) => {
            const isCurrentTurn = participant.id === battle.currentParticipantId;
            const turnState = isCurrentTurn
              ? "CURRENT TURN"
              : participant.kind === "enemy"
                ? `D20 ${formatModifier(participant.dexterityModifier)}`
                : "MANUAL";
            if (participant.kind === "enemy") {
              return (
                <Accordion
                  className={`turn-row turn-row-expandable card${isCurrentTurn ? " current-turn" : ""}`}
                  key={participant.id}
                  variant="default"
                >
                  <Accordion.Item value={participant.id}>
                  <Accordion.Control className="turn-row-summary">
                    <span className="turn-number">{String(index + 1).padStart(2, "0")}</span>
                    <ProfileAvatar
                      name={participant.monster.name}
                      imageId={participant.monster.profileImageId}
                    />
                    <span className="turn-name">
                      <strong>{participant.name}</strong>
                      <small>Enemy · {participant.monster.creatureType}</small>
                    </span>
                    <span className="initiative-score">
                      <small>INITIATIVE</small>
                      <strong>{participant.initiative}</strong>
                    </span>
                    <span className="turn-state">{turnState}</span>
                  </Accordion.Control>
                  <Accordion.Panel
                    className="enemy-combatant-details"
                    classNames={{ content: "enemy-combatant-content" }}
                  >
                    <div className="enemy-combatant-trackers">
                      <div className="form-field enemy-hit-points-field">
                        <span>Current HP</span>
                        <BattleNumberInput
                          value={participant.currentHitPoints}
                          min={0}
                          max={participant.maxHitPoints}
                          label={`${participant.name} current HP`}
                          onCommit={(value) => onUpdateEnemyHitPoints(participant.id, value)}
                        />
                      </div>
                      <span className="enemy-max-hit-points">/ {participant.maxHitPoints} max HP</span>
                      <div className="enemy-spell-slots">
                        <strong>Spell slots</strong>
                        {participant.spellSlots.length === 0 ? (
                          <span className="muted-copy">None configured</span>
                        ) : (
                          participant.spellSlots.map((slot) => (
                            <div className="enemy-spell-slot" key={slot.level}>
                              <span>{spellLevelLabel(slot.level)}</span>
                              <BattleNumberInput
                                value={slot.remaining}
                                min={0}
                                max={slot.maximum}
                                label={`${participant.name} remaining ${spellLevelLabel(slot.level)} spell slots`}
                                onCommit={(value) =>
                                  onUpdateEnemySpellSlots(participant.id, slot.level, value)
                                }
                              />
                              <small>{slot.maximum - slot.remaining} used / {slot.maximum}</small>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <section className="enemy-spells">
                      <h3>Spell uses</h3>
                      {participant.sharedDailySpellPools.length > 0 && (
                        <div className="enemy-daily-pools">
                          {participant.sharedDailySpellPools.map((pool) => (
                            <span className="enemy-daily-pool" key={pool.usesPerDay}>
                              Shared {pool.usesPerDay}/day pool: {pool.maximum - pool.remaining} used · {pool.remaining} left
                            </span>
                          ))}
                        </div>
                      )}
                      {participant.monster.spells.length === 0 ? (
                        <p className="muted-copy">No spells configured.</p>
                      ) : (
                        <div className="enemy-spell-list">
                          {participant.monster.spells.map((spell) => {
                            const resourceStatus = getSpellResourceStatus(participant, spell);
                            return (
                              <div className="enemy-spell-row" key={spell.id}>
                                <span className="enemy-spell-copy">
                                  <strong>{spell.name}</strong>
                                  <small>{spellUsageLabel(spell.usage)} · {resourceStatus}</small>
                                </span>
                                {spell.usage.type === "at-will" ? (
                                  <span className="enemy-spell-at-will">At will</span>
                                ) : (
                                  <AppButton
                                    className="secondary-button"
                                    type="button"
                                    disabled={!canCastMonsterSpell(participant, spell)}
                                    onClick={() => onCastEnemySpell(participant.id, spell.id)}
                                  >
                                    Cast
                                  </AppButton>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                    <section className="enemy-stat-block">
                      <h3>Stat block</h3>
                      <CreatureStatBlock
                        stats={{
                          ...participant.monster,
                          speed: formatMovementInSquares(participant.monster.speed),
                        }}
                        spellSlots={participant.monster.spellSlots}
                        spells={participant.monster.spells}
                        speedLabel="Speed (5-ft squares)"
                      />
                    </section>
                  </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              );
            }
            return (
              <article
                className={`turn-row card${isCurrentTurn ? " current-turn" : ""}`}
                key={participant.id}
              >
                <span className="turn-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="turn-avatar player">♟</span>
                <span className="turn-name">
                  <strong>{participant.name}</strong>
                  <small>Player character</small>
                </span>
                <span className="initiative-score">
                  <small>INITIATIVE</small>
                  <strong>{participant.initiative}</strong>
                </span>
                <span className="turn-state">{turnState}</span>
              </article>
            );
          })}
        </div>
        {activeParticipant && (
          <p className="turn-announcement" aria-live="polite">
            It’s <strong>{activeParticipant.name}</strong>’s turn.
          </p>
        )}
    </>
  );
}
