import { useEffect, useState, type FormEvent } from "react";
import { TextInput } from "@mantine/core";
import AppButton from "../../shared/app-button.component";
import ResourceNotes from "../../shared/resource-notes.component";
import LocationSection from "./location-section.component";
import { NpcSection, PlayersSection } from "./campaign-people-sections.component";
import { createEmptyResourceNotes } from "../../shared/resource-notes.utils";
import type {
  Campaign,
  LocationNode,
  Npc,
  Player,
  ResourceNavigation,
  ResourceNotes as ResourceNotesValue,
  ResourceOption,
} from "../../workspace.types";

type CampaignTab = "players" | "npcs" | "locations" | "notes";

interface CampaignsPageProps {
  campaigns: Campaign[];
  resources: ResourceOption[];
  selectedCampaignId: string;
  onSelectCampaign: (id: string) => void;
  onCreateCampaign: (name: string) => Campaign;
  onAddPlayer: (campaignId: string, player: Player) => void;
  onRemovePlayer: (campaignId: string, playerId: string) => void;
  onUpdateCampaignNotes: (campaignId: string, notes: ResourceNotesValue) => void;
  onUpdatePlayerNotes: (campaignId: string, playerId: string, notes: ResourceNotesValue) => void;
  onUpdatePlayerProfileImage: (campaignId: string, playerId: string, imageId: string | null) => void;
  onSaveNpc: (campaignId: string, npc: Npc) => void;
  onDeleteNpc: (campaignId: string, npcId: string) => void;
  onSaveLocation: (campaignId: string, location: LocationNode) => void;
  onDeleteLocation: (campaignId: string, locationId: string) => void;
  onDeleteCampaign: (campaignId: string) => void;
  resourceNavigation: ResourceNavigation | null;
  onOpenResource: (resource: ResourceNavigation["resource"]) => void;
  onFinishResourceNavigation: (requestId: string) => void;
}

function CampaignsPage({
  campaigns,
  resources,
  selectedCampaignId,
  onSelectCampaign,
  onCreateCampaign,
  onAddPlayer,
  onRemovePlayer,
  onUpdateCampaignNotes,
  onUpdatePlayerNotes,
  onUpdatePlayerProfileImage,
  onSaveNpc,
  onDeleteNpc,
  onSaveLocation,
  onDeleteLocation,
  onDeleteCampaign,
  resourceNavigation,
  onOpenResource,
  onFinishResourceNavigation,
}: CampaignsPageProps) {
  const [campaignName, setCampaignName] = useState("");
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [addingPlayers, setAddingPlayers] = useState<Record<string, boolean>>({});
  const [campaignTabs, setCampaignTabs] = useState<Record<string, CampaignTab>>({});
  const sortedCampaigns = [...campaigns].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  useEffect(() => {
    if (!resourceNavigation) return;
    const { resource, requestId } = resourceNavigation;
    if (resource.type === "campaign") {
      document.getElementById(`resource-campaign-${resource.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      onFinishResourceNavigation(requestId);
      return;
    }

    if (resource.type === "player" || resource.type === "npc" || resource.type === "location") {
      const campaignId = resource.campaignId;
      if (!campaignId) return;
      onSelectCampaign(campaignId);
      const tab: CampaignTab = resource.type === "player"
        ? "players"
        : resource.type === "npc"
          ? "npcs"
          : "locations";
      setCampaignTabs((current) => ({ ...current, [campaignId]: tab }));
    }
  }, [onFinishResourceNavigation, onSelectCampaign, resourceNavigation]);

  function submitCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = campaignName.trim();
    if (!name) return;

    const campaign = onCreateCampaign(name);
    onSelectCampaign(campaign.id);
    setCampaignName("");
    setIsCreatingCampaign(false);
  }

  function closeCampaignForm() {
    setCampaignName("");
    setIsCreatingCampaign(false);
  }

  function submitPlayer(event: FormEvent<HTMLFormElement>, campaignId: string) {
    event.preventDefault();
    const name = (playerNames[campaignId] ?? "").trim();
    if (!name) return;

    onAddPlayer(campaignId, {
      id: crypto.randomUUID(),
      name,
      profileImageId: null,
      notes: createEmptyResourceNotes(),
    });
    setPlayerNames((current) => ({ ...current, [campaignId]: "" }));
    setAddingPlayers((current) => ({ ...current, [campaignId]: false }));
  }

  return (
    <section className="workspace-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">KEEP YOUR TABLES ORGANIZED</p>
          <h1>Campaigns</h1>
          <p className="page-lede">Keep each party, its characters, and its places together.</p>
        </div>
        <AppButton
          className="primary-button"
          type="button"
          onClick={() => setIsCreatingCampaign(true)}
        >
          ＋ Add campaign
        </AppButton>
      </div>

      {isCreatingCampaign && <form className="create-row card" onSubmit={submitCampaign}>
        <TextInput
          className="grow-field"
          label="New campaign"
          value={campaignName}
          onChange={(event) => setCampaignName(event.currentTarget.value)}
          placeholder="e.g. Shadows of Aethermoor"
          required
        />
        <AppButton className="primary-button" type="submit">＋ Create campaign</AppButton>
        <AppButton className="secondary-button" type="button" onClick={closeCampaignForm}>
          Cancel
        </AppButton>
      </form>}

      {campaigns.length === 0 ? (
        <div className="empty-state card">
          <span className="empty-state-icon">▤</span>
          <h2>Your campaign list is empty</h2>
          <p>Add a campaign to organize its players, NPCs, and locations.</p>
        </div>
      ) : (
        <div className="campaign-list">
          {sortedCampaigns.map((campaign) => {
            const activeTab = campaignTabs[campaign.id] ?? "players";
            return (
              <article
                className={`campaign-card card${selectedCampaignId === campaign.id ? " selected" : ""}`}
                key={campaign.id}
                id={`resource-campaign-${campaign.id}`}
              >
                <div className="campaign-card-heading">
                  <AppButton
                    className="campaign-select"
                    type="button"
                    onClick={() => onSelectCampaign(campaign.id)}
                    aria-pressed={selectedCampaignId === campaign.id}
                  >
                    <span className="campaign-symbol">✳</span>
                    <span>
                      <strong>{campaign.name}</strong>
                      <small>
                        {campaign.players.length} players · {campaign.npcs.length} NPCs · {campaign.locations.filter((node) => node.kind === "location").length} locations
                      </small>
                    </span>
                  </AppButton>
                  <AppButton
                    className="danger-text-button"
                    type="button"
                    onClick={() => onDeleteCampaign(campaign.id)}
                  >
                    Delete
                  </AppButton>
                </div>

                <div className="campaign-tabs" role="tablist" aria-label={`${campaign.name} sections`}>
                  {(["players", "npcs", "locations", "notes"] as const).map((tab) => (
                    <AppButton
                      className={`campaign-tab${activeTab === tab ? " active" : ""}`}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab}
                      key={tab}
                      onClick={() => setCampaignTabs((current) => ({ ...current, [campaign.id]: tab }))}
                    >
                      {tab === "players" ? "Players" : tab === "npcs" ? "NPCs" : tab === "locations" ? "Locations" : "Notes"}
                    </AppButton>
                  ))}
                </div>

                {activeTab === "players" && (
                  <PlayersSection
                    campaign={campaign}
                    resources={resources}
                    playerName={playerNames[campaign.id] ?? ""}
                    isAddingPlayer={addingPlayers[campaign.id] ?? false}
                    onPlayerNameChange={(value) => setPlayerNames((current) => ({ ...current, [campaign.id]: value }))}
                    onSubmitPlayer={(event) => submitPlayer(event, campaign.id)}
                    onShowPlayerForm={() => setAddingPlayers((current) => ({ ...current, [campaign.id]: true }))}
                    onHidePlayerForm={() => setAddingPlayers((current) => ({ ...current, [campaign.id]: false }))}
                    onRemovePlayer={onRemovePlayer}
                    onUpdatePlayerNotes={onUpdatePlayerNotes}
                    onUpdatePlayerProfileImage={onUpdatePlayerProfileImage}
                    onOpenResource={onOpenResource}
                    resourceNavigation={resourceNavigation}
                    onFinishResourceNavigation={onFinishResourceNavigation}
                  />
                )}

                {activeTab === "npcs" && (
                  <NpcSection
                    campaign={campaign}
                    resources={resources}
                    onSaveNpc={onSaveNpc}
                    onDeleteNpc={onDeleteNpc}
                    onOpenResource={onOpenResource}
                    resourceNavigation={resourceNavigation}
                    onFinishResourceNavigation={onFinishResourceNavigation}
                  />
                )}

                {activeTab === "locations" && (
                  <LocationSection
                    campaign={campaign}
                    resources={resources}
                    onSaveLocation={onSaveLocation}
                    onDeleteLocation={onDeleteLocation}
                    onOpenResource={onOpenResource}
                    resourceNavigation={resourceNavigation}
                    onFinishResourceNavigation={onFinishResourceNavigation}
                  />
                )}
                {activeTab === "notes" && (
                  <div className="campaign-section">
                    <ResourceNotes
                      value={campaign.notes}
                      resources={resources}
                      onOpenResource={onOpenResource}
                      onChange={(notes) => onUpdateCampaignNotes(campaign.id, notes)}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default CampaignsPage;
