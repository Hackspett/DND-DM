import { type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Checkbox, NativeSelect, NumberInput, TextInput } from "@mantine/core";
import AppButton from "../../shared/app-button.component";
import ProfileAvatar from "../../shared/profile-avatar.component";
import ResourceNotes from "../../shared/resource-notes.component";
import { abilityModifier } from "./battle.utils";
import PageHeading from "./battle-page-heading.component";
import { formatModifier } from "./battle.utils";
import type {
  AppPage,
  Campaign,
  Monster,
  PreparedBattle,
  ResourceNavigation,
  ResourceNotes as ResourceNotesValue,
  ResourceOption,
} from "../../workspace.types";

interface BattleCreatorViewProps {
  campaigns: Campaign[];
  monsters: Monster[];
  resources: ResourceOption[];
  selectedCampaign: Campaign | undefined;
  selectedPlayerIds: string[];
  setSelectedPlayerIds: Dispatch<SetStateAction<string[]>>;
  enemyCounts: Record<string, number>;
  setEnemyCounts: Dispatch<SetStateAction<Record<string, number>>>;
  battleName: string;
  setBattleName: Dispatch<SetStateAction<string>>;
  battleNotes: ResourceNotesValue;
  setBattleNotes: Dispatch<SetStateAction<ResourceNotesValue>>;
  editingBattleId: string;
  playerInitiatives: Record<string, string>;
  setPlayerInitiatives: Dispatch<SetStateAction<Record<string, string>>>;
  phase: "setup" | "initiative";
  setPhase: Dispatch<SetStateAction<"setup" | "initiative">>;
  isCreatingBattle: boolean;
  setIsCreatingBattle: Dispatch<SetStateAction<boolean>>;
  error: string;
  saveMessage: string;
  selectedEnemyUnits: { id: string; name: string; monsterId: string; dexterityScore: number }[];
  onNavigate: (page: AppPage) => void;
  onClearMessages: () => void;
  onOpenResource: (resource: ResourceNavigation["resource"]) => void;
  onChangeCampaign: (campaignId: string) => void;
  onTogglePlayer: (playerId: string, checked: boolean) => void;
  onSetEnemyCount: (monsterId: string, count: number) => void;
  onSavePreparedEncounter: () => void;
  onPrepareInitiative: (event: FormEvent<HTMLFormElement>) => void;
  onStartBattle: (event: FormEvent<HTMLFormElement>) => void;
  onCloseBattleForm: () => void;
  onLoadPreparedEncounter: (battle: PreparedBattle) => void;
  onDeletePreparedEncounter: (battle: PreparedBattle) => void;
}

export default function BattleCreatorView({
  campaigns,
  monsters,
  resources,
  selectedCampaign,
  selectedPlayerIds,
  setSelectedPlayerIds,
  enemyCounts,
  setEnemyCounts,
  battleName,
  setBattleName,
  battleNotes,
  setBattleNotes,
  editingBattleId,
  playerInitiatives,
  setPlayerInitiatives,
  phase,
  setPhase,
  isCreatingBattle,
  setIsCreatingBattle,
  error,
  saveMessage,
  selectedEnemyUnits,
  onNavigate,
  onClearMessages,
  onOpenResource,
  onChangeCampaign,
  onTogglePlayer,
  onSetEnemyCount,
  onSavePreparedEncounter,
  onPrepareInitiative,
  onStartBattle,
  onCloseBattleForm,
  onLoadPreparedEncounter,
  onDeletePreparedEncounter,
}: BattleCreatorViewProps) {
  return (
    <section className="workspace-page">
      <PageHeading mode="creator" />
      {phase === "setup" ? (
        isCreatingBattle ? (
        <form className="battle-setup" onSubmit={onPrepareInitiative}>
          <section className="card setup-section">
            <div className="form-heading">
              <div>
                <p className="eyebrow">STEP 1</p>
                <h2>Choose your party</h2>
              </div>
              <AppButton className="subtle-button" type="button" onClick={onCloseBattleForm}>
                Cancel
              </AppButton>
            </div>
            <TextInput
              className="form-field campaign-picker"
              label="Battle name (for saving this setup)"
              value={battleName}
              onChange={(event) => {
                  setBattleName(event.currentTarget.value);
                  onClearMessages();
                }}
              placeholder="e.g. Ambush at the Old Mill"
            />
            <NativeSelect
              className="form-field campaign-picker"
              label="Campaign"
              value={selectedCampaign?.id ?? ""}
              onChange={(event) => onChangeCampaign(event.currentTarget.value)}
            >
                {campaigns.map((campaign) => (
                  <option value={campaign.id} key={campaign.id}>{campaign.name}</option>
                ))}
            </NativeSelect>
            <ResourceNotes
              value={battleNotes}
              resources={resources}
              onOpenResource={onOpenResource}
              onChange={setBattleNotes}
            />
            {!selectedCampaign || selectedCampaign.players.length === 0 ? (
              <div className="inline-empty">
                <p>This campaign has no players yet.</p>
                <AppButton className="subtle-button" type="button" onClick={() => onNavigate("Campaigns")}>Add players →</AppButton>
              </div>
            ) : (
              <div className="selection-grid">
                {selectedCampaign.players.map((player) => (
                  <Checkbox
                    className="selection-card"
                    key={player.id}
                    checked={selectedPlayerIds.includes(player.id)}
                    onChange={(event) => onTogglePlayer(player.id, event.currentTarget.checked)}
                    label={<>
                      <ProfileAvatar name={player.name} imageId={player.profileImageId} />
                      <span className="selection-copy">
                        <strong>{player.name}</strong>
                        <small>Player character</small>
                      </span>
                      <span className="selection-check">✓</span>
                    </>}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="card setup-section">
            <div className="form-heading">
              <div>
                <p className="eyebrow">STEP 2</p>
                <h2>Add enemies</h2>
              </div>
              <span className="count-badge">{monsters.length} available</span>
            </div>
            {monsters.length === 0 ? (
              <div className="inline-empty">
                <p>Your compendium is empty. Add stat blocks before preparing this battle.</p>
                <AppButton className="subtle-button" type="button" onClick={() => onNavigate("Compendium")}>Open compendium →</AppButton>
              </div>
            ) : (
              <div className="enemy-selection-list">
                {monsters.map((monster) => {
                  const count = enemyCounts[monster.id] ?? 0;
                  const dexterityModifier = abilityModifier(monster.abilityScores.DEX);
                  return (
                    <div className={`enemy-selection-row${count > 0 ? " chosen" : ""}`} key={monster.id}>
                      <Checkbox
                        className="enemy-select-label"
                        checked={count > 0}
                        onChange={(event) => onSetEnemyCount(monster.id, event.currentTarget.checked ? 1 : 0)}
                        label={<>
                          <span className="enemy-mark">♜</span>
                          <span>
                            <strong>{monster.name}</strong>
                            <small>AC {monster.armorClass} · HP {monster.hitPoints} · DEX {formatModifier(dexterityModifier)}</small>
                          </span>
                        </>}
                      />
                      <NumberInput
                        className="enemy-count"
                        label="Count"
                        aria-label={`${monster.name} count`}
                        min={0}
                        max={20}
                        step={1}
                        value={count}
                        onChange={(value) => {
                          const count = value === "" ? 0 : Number(value);
                          onSetEnemyCount(monster.id, Math.min(20, Math.max(0, Math.floor(count))));
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {error && <p className="form-error" role="alert">{error}</p>}
          {saveMessage && <p className="save-message" role="status">{saveMessage}</p>}
          <div className="battle-footer">
            <p>Each enemy gets its own d20 roll when the battle starts.</p>
            <div className="battle-footer-actions">
              <AppButton className="secondary-button" type="button" onClick={onSavePreparedEncounter}>
                {editingBattleId ? "Save changes" : "Save battle"}
              </AppButton>
              <AppButton className="primary-button" type="submit">Continue to initiative →</AppButton>
            </div>
          </div>
        </form>
        ) : (
          <div className="card battle-create-prompt">
            <div>
              <h2>Ready to create an encounter?</h2>
              <p className="muted-copy">Choose a party and enemies, then set initiative to start.</p>
            </div>
            <AppButton className="primary-button" type="button" onClick={() => setIsCreatingBattle(true)}>
              ＋ Create battle
            </AppButton>
          </div>
        )
      ) : (
        <form className="initiative-form card" onSubmit={onStartBattle}>
          <div className="form-heading">
            <div>
              <p className="eyebrow">STEP 3</p>
              <h2>Set initiative</h2>
              <p className="page-lede">Enter each player’s total. Enemy initiative is rolled automatically on start.</p>
            </div>
            <AppButton className="secondary-button" type="button" onClick={() => setPhase("setup")}>← Back</AppButton>
          </div>

          <div className="initiative-section">
            <h3>Players · manual initiative</h3>
            {selectedCampaign?.players
              .filter((player) => selectedPlayerIds.includes(player.id))
              .map((player) => (
                <div className="initiative-input-row" key={player.id}>
                  <ProfileAvatar name={player.name} imageId={player.profileImageId} />
                  <strong>{player.name}</strong>
                  <span className="initiative-label">Total</span>
                  <NumberInput
                    className="initiative-input"
                    value={playerInitiatives[player.id] ?? ""}
                    onChange={(value) =>
                      setPlayerInitiatives((current) => ({
                        ...current,
                        [player.id]: String(value),
                      }))
                    }
                    aria-label={`${player.name} initiative`}
                    required
                  />
                </div>
              ))}
          </div>

          <div className="initiative-section">
            <h3>Enemies · automatic initiative</h3>
            {selectedEnemyUnits.map((enemy) => {
              const dexterityModifier = abilityModifier(enemy.dexterityScore);
              return (
                <div className="initiative-input-row enemy-preview" key={enemy.id}>
                  <span className="enemy-mark">♜</span>
                  <strong>{enemy.name}</strong>
                  <span className="enemy-roll-preview">own d20 {formatModifier(dexterityModifier)}</span>
                </div>
              );
            })}
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-submit-row">
            <AppButton className="primary-button" type="submit">Roll enemies &amp; start battle</AppButton>
          </div>
        </form>
      )}
      {phase === "setup" && (
        <section className="card setup-section saved-battles-section">
          <div className="form-heading">
            <div>
              <p className="eyebrow">PREPARED IN ADVANCE</p>
              <h2>Saved battles</h2>
            </div>
            <span className="count-badge">{selectedCampaign?.preparedBattles.length ?? 0} saved</span>
          </div>
          {!selectedCampaign || selectedCampaign.preparedBattles.length === 0 ? (
            <p className="muted-copy">Save an encounter setup to keep it under the selected campaign for later.</p>
          ) : (
            <div className="saved-battle-list">
              {selectedCampaign.preparedBattles.map((battle) => {
                const enemyCount = battle.enemies.reduce(
                  (total, enemy) => total + enemy.count,
                  0,
                );
                return (
                  <div className="saved-battle-row" key={battle.id} id={`resource-battle-${battle.id}`}>
                    <div className="saved-battle-main">
                      <span className="saved-battle-mark">⚔</span>
                      <span className="saved-battle-copy">
                        <strong>{battle.name}</strong>
                        <small>{battle.playerIds.length} players · {enemyCount} enemies</small>
                      </span>
                      <div className="saved-battle-actions">
                        <AppButton className="secondary-button" type="button" onClick={() => onLoadPreparedEncounter(battle)}>
                          Load
                        </AppButton>
                        <AppButton className="danger-text-button" type="button" onClick={() => onDeletePreparedEncounter(battle)}>
                          Delete
                        </AppButton>
                      </div>
                    </div>
                    <ResourceNotes
                      value={battle.notes}
                      resources={resources}
                      onOpenResource={onOpenResource}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
