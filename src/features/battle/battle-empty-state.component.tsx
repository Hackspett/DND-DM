import AppButton from "../../shared/app-button.component";
import type { AppPage } from "../../workspace.types";
import PageHeading from "./battle-page-heading.component";

export default function BattleEmptyState({
  mode,
  kind,
  onNavigate,
}: {
  mode: "creator" | "current";
  kind: "inactive" | "no-campaigns";
  onNavigate: (page: AppPage) => void;
}) {
  const isInactive = kind === "inactive";
  return (
    <section className="workspace-page">
      <PageHeading mode={mode} />
      <div className="empty-state card">
        <span className="empty-state-icon">⚔</span>
        <h2>{isInactive ? "This battle is no longer active" : "Create a campaign first"}</h2>
        <p>
          {isInactive
            ? "Choose another encounter from the Current Battles section in the sidebar."
            : "Campaign players are selected when setting up a battle."}
        </p>
        <AppButton
          className="primary-button"
          type="button"
          onClick={() => onNavigate(isInactive ? "Battles" : "Campaigns")}
        >
          {isInactive ? "Create a battle" : "Go to campaigns"}
        </AppButton>
      </div>
    </section>
  );
}
