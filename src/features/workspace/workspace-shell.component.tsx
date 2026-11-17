import type { Dispatch, SetStateAction } from "react";
import AppButton from "../../shared/app-button.component";
import BattlePage from "../battle/battle-page.component";
import type { createBattleActions } from "../battle/battle.actions";
import CampaignsPage from "../campaigns/campaigns-page.component";
import type { createCampaignActions } from "../campaigns/campaigns.actions";
import CompendiumPage from "../compendium/compendium-page.component";
import type { createCompendiumActions } from "../compendium/compendium.actions";
import OverviewPage from "../overview/overview-page.component";
import type {
  ActiveBattle,
  AppPage,
  Campaign,
  CompendiumEntry,
  CurrentBattle,
  GearEntry,
  Monster,
  ResourceLink,
  ResourceNavigation,
  ResourceOption,
} from "../../workspace.types";

const navigation: { page: AppPage; icon: string }[] = [
  { page: "Overview", icon: "⌂" },
  { page: "Campaigns", icon: "▤" },
  { page: "Compendium", icon: "✧" },
  { page: "Battles", icon: "⚔" },
];

interface WorkspaceShellProps {
  campaigns: Campaign[];
  monsters: Monster[];
  items: CompendiumEntry[];
  gear: GearEntry[];
  effects: CompendiumEntry[];
  currentBattle: CurrentBattle | null;
  saveCurrentBattle: (battle: CurrentBattle | null) => void;
  selectedCampaignId: string;
  selectedActiveBattleId: string;
  activePage: AppPage;
  setActivePage: Dispatch<SetStateAction<AppPage>>;
  setSelectedCampaignId: Dispatch<SetStateAction<string>>;
  setSelectedActiveBattleId: Dispatch<SetStateAction<string>>;
  resources: ResourceOption[];
  resourceNavigation: ResourceNavigation | null;
  isSaving: boolean;
  saveError: string;
  setSaveAttempt: Dispatch<SetStateAction<number>>;
  openResource: (resource: ResourceLink) => void;
  finishResourceNavigation: (requestId: string) => void;
  campaignActions: ReturnType<typeof createCampaignActions>;
  compendiumActions: ReturnType<typeof createCompendiumActions>;
  battleActions: ReturnType<typeof createBattleActions>;
}

export default function WorkspaceShell({
  campaigns,
  monsters,
  items,
  gear,
  effects,
  currentBattle,
  saveCurrentBattle,
  selectedCampaignId,
  selectedActiveBattleId,
  activePage,
  setActivePage,
  setSelectedCampaignId,
  setSelectedActiveBattleId,
  resources,
  resourceNavigation,
  isSaving,
  saveError,
  setSaveAttempt,
  openResource,
  finishResourceNavigation,
  campaignActions,
  compendiumActions,
  battleActions,
}: WorkspaceShellProps) {
  const orderedCampaigns = [...campaigns].sort((a, b) => a.name.localeCompare(b.name));
  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId);
  const activeBattles = campaigns.flatMap((campaign) =>
    campaign.activeBattles.map((battle) => ({ campaign, battle })),
  );
  const totalPlayers = campaigns.reduce((total, campaign) => total + campaign.players.length, 0);
  const {
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
  } = campaignActions;
  const {
    saveMonster,
    deleteMonster,
    saveCompendiumEntry,
    deleteCompendiumEntry,
    saveGearEntry,
    deleteGearEntry,
  } = compendiumActions;
  const {
    savePreparedBattle,
    deletePreparedBattle,
    saveActiveBattle,
    deleteActiveBattle,
    startActiveBattle,
  } = battleActions;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <AppButton className="brand" type="button" onClick={() => setActivePage("Overview")}>
          <span className="brand-mark">✳</span>
          <span>hearthside</span>
        </AppButton>

        <div className="sidebar-label">YOUR TABLE</div>
        <nav className="navigation" aria-label="Main navigation">
          {navigation.map((item) => (
            <AppButton
              className={`nav-item${activePage === item.page ? " active" : ""}`}
              type="button"
              key={item.page}
              onClick={() => setActivePage(item.page)}
              aria-current={activePage === item.page ? "page" : undefined}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              {item.page}
            </AppButton>
          ))}
        </nav>
        <div className="current-battles-nav">
          <div className="sidebar-label">CURRENT BATTLES</div>
          {activeBattles.length === 0 ? (
            <p className="muted-copy current-battle-empty">No active battles</p>
          ) : activeBattles.map(({ campaign, battle }) => (
            <AppButton
              className={`nav-item current-battle-nav-item${activePage === "Current Battle" && selectedCampaignId === campaign.id && selectedActiveBattleId === battle.id ? " active" : ""}`}
              type="button"
              key={`${campaign.id}:${battle.id}`}
              onClick={() => {
                setSelectedCampaignId(campaign.id);
                setSelectedActiveBattleId(battle.id);
                setActivePage("Current Battle");
              }}
              aria-current={activePage === "Current Battle" && selectedCampaignId === campaign.id && selectedActiveBattleId === battle.id ? "page" : undefined}
              aria-label={`Open ${battle.name}`}
            >
              <span className="nav-icon" aria-hidden="true">⚔</span>
              <span className="current-battle-copy">
                <strong>{battle.name || "Untitled battle"}</strong>
                <small>{campaign.name}</small>
              </span>
            </AppButton>
          ))}
        </div>

        <div className="sidebar-campaign">
          <div className="sidebar-label">CAMPAIGNS</div>
          {orderedCampaigns.length === 0 ? (
            <AppButton className="campaign-add-link" type="button" onClick={() => setActivePage("Campaigns")}>
              ＋ Add a campaign
            </AppButton>
          ) : (
            <div className="sidebar-campaign-list">
              {orderedCampaigns.slice(0, 4).map((campaign) => (
                <AppButton
                  className={`campaign-mini${campaign.id === selectedCampaignId ? " selected" : ""}`}
                  type="button"
                  key={campaign.id}
                  onClick={() => {
                    setSelectedCampaignId(campaign.id);
                    setActivePage("Campaigns");
                  }}
                >
                  <span className="campaign-dot" />
                  <span className="campaign-mini-copy">
                    <strong>{campaign.name}</strong>
                    <small>{campaign.players.length} players</small>
                  </span>
                </AppButton>
              ))}
              {orderedCampaigns.length > 4 && (
                <AppButton className="campaign-more" type="button" onClick={() => setActivePage("Campaigns")}>
                  +{orderedCampaigns.length - 4} more campaigns
                </AppButton>
              )}
            </div>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="avatar">DM</div>
          <div className="profile-copy">
            <strong>Dungeon Master</strong>
            <small>Saved in this browser</small>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>{selectedCampaign?.name ?? "Your workspace"}</span>
            <span className="breadcrumb-divider">/</span>
            <strong>
              {activePage === "Current Battle"
                ? activeBattles.find(({ campaign, battle }) =>
                    campaign.id === selectedCampaignId &&
                    battle.id === selectedActiveBattleId,
                  )?.battle.name ?? "Current Battle"
                : activePage}
            </strong>
          </div>
          <span className="local-badge"><span /> {isSaving ? "Saving to SQLite" : "Saved on this device"}</span>
        </header>

        {saveError && (
          <div className="storage-warning" role="status">
            <span>Could not save to the local database: {saveError}</span>
            <AppButton type="button" onClick={() => setSaveAttempt((attempt) => attempt + 1)}>
              Retry save
            </AppButton>
          </div>
        )}

        <div className="page-content">
          {activePage === "Overview" && (
            <OverviewPage
              campaigns={orderedCampaigns}
              totalPlayers={totalPlayers}
              compendiumCount={monsters.length + items.length + gear.length + effects.length}
              onNavigate={setActivePage}
            />
          )}
          {activePage === "Campaigns" && (
            <CampaignsPage
              campaigns={orderedCampaigns}
              resources={resources}
              selectedCampaignId={selectedCampaignId}
              onSelectCampaign={setSelectedCampaignId}
              onCreateCampaign={createCampaign}
              onAddPlayer={addPlayer}
              onRemovePlayer={removePlayer}
              onUpdateCampaignNotes={updateCampaignNotes}
              onUpdatePlayerNotes={updatePlayerNotes}
              onUpdatePlayerProfileImage={updatePlayerProfileImage}
              onSaveNpc={saveNpc}
              onDeleteNpc={deleteNpc}
              onSaveLocation={saveLocation}
              onDeleteLocation={deleteLocation}
              onDeleteCampaign={deleteCampaign}
              resourceNavigation={resourceNavigation}
              onOpenResource={openResource}
              onFinishResourceNavigation={finishResourceNavigation}
            />
          )}
          {activePage === "Compendium" && (
            <CompendiumPage
              monsters={monsters}
              items={items}
              gear={gear}
              effects={effects}
              resources={resources}
              onSaveMonster={saveMonster}
              onDeleteMonster={deleteMonster}
              onSaveEntry={saveCompendiumEntry}
              onDeleteEntry={deleteCompendiumEntry}
              onSaveGear={saveGearEntry}
              onDeleteGear={deleteGearEntry}
              resourceNavigation={resourceNavigation}
              onOpenResource={openResource}
              onFinishResourceNavigation={finishResourceNavigation}
            />
          )}
          {(activePage === "Battles" || activePage === "Current Battle") && (
            <BattlePage
              mode={activePage === "Battles" ? "creator" : "current"}
              campaigns={orderedCampaigns}
              monsters={monsters}
              selectedCampaignId={selectedCampaignId}
              selectedActiveBattleId={selectedActiveBattleId}
              currentBattle={currentBattle}
              onSelectCampaign={setSelectedCampaignId}
              onNavigate={setActivePage}
              onSavePreparedBattle={savePreparedBattle}
              onDeletePreparedBattle={deletePreparedBattle}
              onSaveActiveBattle={saveActiveBattle}
              onDeleteActiveBattle={deleteActiveBattle}
              onCreateActiveBattle={startActiveBattle}
              onSaveCurrentBattle={saveCurrentBattle}
              resources={resources}
              resourceNavigation={resourceNavigation}
              onOpenResource={openResource}
              onFinishResourceNavigation={finishResourceNavigation}
            />
          )}
        </div>
      </main>
    </div>
  );
}
