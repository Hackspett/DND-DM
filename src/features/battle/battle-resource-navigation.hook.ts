import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { ResourceNavigation } from "../../workspace.types";

export default function useBattleResourceNavigation({
  resourceNavigation,
  phase,
  setPhase,
  onSelectCampaign,
  onFinishResourceNavigation,
}: {
  resourceNavigation: ResourceNavigation | null;
  phase: "setup" | "initiative";
  setPhase: Dispatch<SetStateAction<"setup" | "initiative">>;
  onSelectCampaign: (campaignId: string) => void;
  onFinishResourceNavigation: (requestId: string) => void;
}) {
  useEffect(() => {
    const focus = resourceNavigation;
    if (focus?.resource.type === "battle") {
      setPhase("setup");
      if (focus.resource.campaignId) {
        onSelectCampaign(focus.resource.campaignId);
      }
    }
  }, [onSelectCampaign, resourceNavigation, setPhase]);

  useEffect(() => {
    const focus = resourceNavigation;
    if (focus?.resource.type !== "battle" || phase !== "setup") return;
    document.getElementById(`resource-battle-${focus.resource.id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    onFinishResourceNavigation(focus.requestId);
  }, [onFinishResourceNavigation, phase, resourceNavigation]);
}
