import AppButton from "../../shared/app-button.component";
import type { AppPage, Campaign } from "../../workspace.types";

interface OverviewPageProps {
  campaigns: Campaign[];
  totalPlayers: number;
  compendiumCount: number;
  onNavigate: (page: AppPage) => void;
}

export default function OverviewPage({
  campaigns,
  totalPlayers,
  compendiumCount,
  onNavigate,
}: OverviewPageProps) {
  const today = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <section className="workspace-page overview-page">
      <div className="page-title-row overview-title-row">
        <div>
          <p className="eyebrow">{today.toUpperCase()}</p>
          <h1>Your table, <em>at a glance.</em></h1>
          <p className="page-lede">Campaigns, creatures, and combat in one local workspace.</p>
        </div>
        <AppButton className="primary-button" type="button" onClick={() => onNavigate("Campaigns")}>
          ＋ New campaign
        </AppButton>
      </div>

      <div className="overview-stats">
        <article className="overview-stat card">
          <span className="overview-stat-icon green">▤</span>
          <span><small>CAMPAIGNS</small><strong>{campaigns.length}</strong></span>
        </article>
        <article className="overview-stat card">
          <span className="overview-stat-icon purple">♟</span>
          <span><small>PLAYERS</small><strong>{totalPlayers}</strong></span>
        </article>
        <article className="overview-stat card">
          <span className="overview-stat-icon amber">✧</span>
          <span><small>COMPENDIUM ENTRIES</small><strong>{compendiumCount}</strong></span>
        </article>
      </div>

      <div className="overview-section-heading">
        <div>
          <p className="eyebrow">GET YOUR TABLE READY</p>
          <h2>What would you like to do?</h2>
        </div>
      </div>
      <div className="overview-actions">
        <AppButton className="overview-action card" type="button" onClick={() => onNavigate("Campaigns")}>
          <span className="action-icon green">▤</span>
          <span><strong>Set up a campaign</strong><small>Add a campaign and its players.</small></span>
          <span className="tile-arrow">→</span>
        </AppButton>
        <AppButton className="overview-action card" type="button" onClick={() => onNavigate("Compendium")}>
          <span className="action-icon amber">♜</span>
          <span><strong>Build your compendium</strong><small>Save reusable monster stat blocks.</small></span>
          <span className="tile-arrow">→</span>
        </AppButton>
        <AppButton className="overview-action card" type="button" onClick={() => onNavigate("Battles")}>
          <span className="action-icon rose">⚔</span>
          <span><strong>Prepare a battle</strong><small>Choose the party and roll initiative.</small></span>
          <span className="tile-arrow">→</span>
        </AppButton>
      </div>

      <div className="overview-section-heading recent-campaign-heading">
        <div>
          <p className="eyebrow">YOUR TABLES</p>
          <h2>Campaigns</h2>
        </div>
        <AppButton className="subtle-button" type="button" onClick={() => onNavigate("Campaigns")}>
          View all →
        </AppButton>
      </div>
      {campaigns.length === 0 ? (
        <div className="empty-state card compact-empty">
          <p>No campaigns yet. Create one to start organizing your players.</p>
        </div>
      ) : (
        <div className="overview-campaigns">
          {campaigns.slice(0, 3).map((campaign) => (
            <article className="overview-campaign card" key={campaign.id}>
              <span className="campaign-symbol">✳</span>
              <div>
                <strong>{campaign.name}</strong>
                <small>{campaign.players.length} {campaign.players.length === 1 ? "player" : "players"}</small>
              </div>
            </article>
          ))}
        </div>
      )}

      <footer className="page-footer">
        <span>Made for the stories around your table.</span>
        <span>HEARTHSIDE <i>✳</i></span>
      </footer>
    </section>
  );
}

