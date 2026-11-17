import { useEffect, useState, type FormEvent } from "react";
import { Checkbox, TextInput } from "@mantine/core";
import AppButton from "../../shared/app-button.component";
import CreatureStatsFields from "../../shared/creature-stats-fields.component";
import { createEmptyCreatureStats } from "../../shared/creature-stats.utils";
import ImageUpload from "../../shared/image-upload.component";
import ProfileAvatar from "../../shared/profile-avatar.component";
import ResourceNotes from "../../shared/resource-notes.component";
import { createEmptyResourceNotes } from "../../shared/resource-notes.utils";
import type {
  Campaign,
  CreatureStats,
  Npc,
  Player,
  ResourceNavigation,
  ResourceNotes as ResourceNotesValue,
  ResourceOption,
} from "../../workspace.types";

export function PlayersSection({
  campaign,
  resources,
  playerName,
  isAddingPlayer,
  onPlayerNameChange,
  onSubmitPlayer,
  onShowPlayerForm,
  onHidePlayerForm,
  onRemovePlayer,
  onUpdatePlayerNotes,
  onUpdatePlayerProfileImage,
  onOpenResource,
  resourceNavigation,
  onFinishResourceNavigation,
}: {
  campaign: Campaign;
  resources: ResourceOption[];
  playerName: string;
  isAddingPlayer: boolean;
  onPlayerNameChange: (value: string) => void;
  onSubmitPlayer: (event: FormEvent<HTMLFormElement>) => void;
  onShowPlayerForm: () => void;
  onHidePlayerForm: () => void;
  onRemovePlayer: (campaignId: string, playerId: string) => void;
  onUpdatePlayerNotes: (campaignId: string, playerId: string, notes: ResourceNotesValue) => void;
  onUpdatePlayerProfileImage: (campaignId: string, playerId: string, imageId: string | null) => void;
  onOpenResource: (resource: ResourceNavigation["resource"]) => void;
  resourceNavigation: ResourceNavigation | null;
  onFinishResourceNavigation: (requestId: string) => void;
}) {
  useEffect(() => {
    const focus = resourceNavigation;
    if (
      focus?.resource.type !== "player" ||
      focus.resource.campaignId !== campaign.id
    ) {
      return;
    }
    document.getElementById(`resource-player-${focus.resource.id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    onFinishResourceNavigation(focus.requestId);
  }, [campaign.id, onFinishResourceNavigation, resourceNavigation]);

  return (
    <div className="campaign-section">
      {campaign.players.length === 0 ? (
        <p className="muted-copy">No players added yet.</p>
      ) : (
        <div className="campaign-player-list">
          {campaign.players.map((player) => (
            <article className="campaign-player-card" key={player.id} id={`resource-player-${player.id}`}>
              <div className="campaign-player-heading">
                <ProfileAvatar name={player.name} imageId={player.profileImageId} />
                <strong className="campaign-player-name">{player.name}</strong>
                <ImageUpload
                  imageId={player.profileImageId}
                  onChange={(imageId) => onUpdatePlayerProfileImage(campaign.id, player.id, imageId)}
                  label={player.profileImageId ? "Change picture" : "Add picture"}
                  variant="profile"
                />
                <AppButton
                  className="danger-text-button"
                  type="button"
                  aria-label={`Remove ${player.name}`}
                  onClick={() => onRemovePlayer(campaign.id, player.id)}
                >
                  Remove
                </AppButton>
              </div>
              <ResourceNotes
                value={player.notes}
                resources={resources}
                onOpenResource={onOpenResource}
                onChange={(notes) => onUpdatePlayerNotes(campaign.id, player.id, notes)}
              />
            </article>
          ))}
        </div>
      )}
      {isAddingPlayer ? (
        <form className="add-player-row" onSubmit={onSubmitPlayer}>
          <TextInput
            className="form-field"
            value={playerName}
            onChange={(event) => onPlayerNameChange(event.currentTarget.value)}
            placeholder="Player name"
            aria-label={`Add a player to ${campaign.name}`}
            required
          />
          <AppButton className="secondary-button" type="submit">Add player</AppButton>
          <AppButton className="subtle-button" type="button" onClick={onHidePlayerForm}>Cancel</AppButton>
        </form>
      ) : (
        <AppButton className="secondary-button" type="button" onClick={onShowPlayerForm}>
          ＋ Add player
        </AppButton>
      )}
    </div>
  );
}

export function NpcSection({
  campaign,
  resources,
  onSaveNpc,
  onDeleteNpc,
  onOpenResource,
  resourceNavigation,
  onFinishResourceNavigation,
}: {
  campaign: Campaign;
  resources: ResourceOption[];
  onSaveNpc: (campaignId: string, npc: Npc) => void;
  onDeleteNpc: (campaignId: string, npcId: string) => void;
  onOpenResource: (resource: ResourceNavigation["resource"]) => void;
  resourceNavigation: ResourceNavigation | null;
  onFinishResourceNavigation: (requestId: string) => void;
}) {
  const [editingNpcId, setEditingNpcId] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState<ResourceNotesValue>(createEmptyResourceNotes);
  const [profileImageId, setProfileImageId] = useState<string | null>(null);
  const [hasStats, setHasStats] = useState(false);
  const [stats, setStats] = useState<CreatureStats>(createEmptyCreatureStats);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    const focus = resourceNavigation;
    if (
      focus?.resource.type !== "npc" ||
      focus.resource.campaignId !== campaign.id
    ) {
      return;
    }
    document.getElementById(`resource-npc-${focus.resource.id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    onFinishResourceNavigation(focus.requestId);
  }, [campaign.id, onFinishResourceNavigation, resourceNavigation]);

  function resetForm() {
    setEditingNpcId("");
    setName("");
    setNotes(createEmptyResourceNotes());
    setProfileImageId(null);
    setHasStats(false);
    setStats(createEmptyCreatureStats());
    setIsFormOpen(false);
  }

  function editNpc(npc: Npc) {
    setEditingNpcId(npc.id);
    setName(npc.name);
    setNotes(npc.notes);
    setProfileImageId(npc.profileImageId);
    setHasStats(npc.stats !== null);
    setStats(npc.stats ?? createEmptyCreatureStats());
    setIsFormOpen(true);
  }

  function submitNpc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onSaveNpc(campaign.id, {
      id: editingNpcId || crypto.randomUUID(),
      name: trimmedName,
      profileImageId,
      notes,
      stats: hasStats ? stats : null,
    });
    resetForm();
  }

  return (
    <div className="campaign-section npc-section">
      <div className="npc-list">
        {campaign.npcs.length === 0 ? (
          <p className="muted-copy">No NPCs added to this campaign yet.</p>
        ) : (
          campaign.npcs.map((npc) => (
            <article className="npc-card" key={npc.id} id={`resource-npc-${npc.id}`}>
              <div className="npc-card-heading">
                <ProfileAvatar name={npc.name} imageId={npc.profileImageId} />
                <div>
                  <strong>{npc.name}</strong>
                  {npc.stats && <small>{npc.stats.creatureType} · AC {npc.stats.armorClass} · {npc.stats.hitPoints} HP</small>}
                </div>
                <div className="npc-actions">
                  <AppButton className="subtle-button" type="button" onClick={() => editNpc(npc)}>Edit</AppButton>
                  <AppButton className="danger-text-button" type="button" onClick={() => onDeleteNpc(campaign.id, npc.id)}>Delete</AppButton>
                </div>
              </div>
              <ResourceNotes
                value={npc.notes}
                resources={resources}
                onOpenResource={onOpenResource}
              />
            </article>
          ))
        )}
      </div>

      {!isFormOpen ? (
        <AppButton className="secondary-button" type="button" onClick={() => setIsFormOpen(true)}>
          ＋ Add NPC
        </AppButton>
      ) : <form className="npc-form" onSubmit={submitNpc}>
        <h3>{editingNpcId ? "Edit NPC" : "Add an NPC"}</h3>
        <TextInput
          className="form-field"
          label="Name *"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          required
        />
        <ImageUpload
          imageId={profileImageId}
          onChange={setProfileImageId}
          label={profileImageId ? "Change profile picture" : "Add profile picture"}
          variant="profile"
        />
        <ResourceNotes
          value={notes}
          resources={resources}
          onOpenResource={onOpenResource}
          onChange={setNotes}
        />
        <Checkbox
          className="checkbox-field"
          checked={hasStats}
          onChange={(event) => setHasStats(event.currentTarget.checked)}
          label="Add a creature stat block"
        />
        {hasStats && (
          <CreatureStatsFields
            stats={stats}
            onChange={(key, value) =>
              setStats((current) => ({ ...current, [key]: value }))
            }
          />
        )}
        <div className="form-submit-row">
          <AppButton className="primary-button" type="submit">{editingNpcId ? "Save NPC" : "Add NPC"}</AppButton>
          <AppButton className="secondary-button" type="button" onClick={resetForm}>Cancel</AppButton>
        </div>
      </form>}
    </div>
  );
}

