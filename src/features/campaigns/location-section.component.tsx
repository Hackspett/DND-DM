import { useEffect, useState, type FormEvent } from "react";
import { TextInput } from "@mantine/core";
import AppButton from "../../shared/app-button.component";
import ResourceNotes from "../../shared/resource-notes.component";
import { createEmptyResourceNotes } from "../../shared/resource-notes.utils";
import type {
  Campaign,
  LocationNode,
  ResourceNavigation,
  ResourceNotes as ResourceNotesValue,
  ResourceOption,
} from "../../workspace.types";

export default function LocationSection({
  campaign,
  resources,
  onSaveLocation,
  onDeleteLocation,
  onOpenResource,
  resourceNavigation,
  onFinishResourceNavigation,
}: {
  campaign: Campaign;
  resources: ResourceOption[];
  onSaveLocation: (campaignId: string, location: LocationNode) => void;
  onDeleteLocation: (campaignId: string, locationId: string) => void;
  onOpenResource: (resource: ResourceNavigation["resource"]) => void;
  resourceNavigation: ResourceNavigation | null;
  onFinishResourceNavigation: (requestId: string) => void;
}) {
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set());
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [creating, setCreating] = useState<{
    kind: LocationNode["kind"];
    parentId: string | null;
  } | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState<ResourceNotesValue>(createEmptyResourceNotes);
  const selectedLocation = campaign.locations.find((node) => node.id === selectedLocationId);
  const rootLocations = campaign.locations
    .filter((node) => node.parentId === null)
    .sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    const focus = resourceNavigation;
    if (
      focus?.resource.type !== "location" ||
      focus.resource.campaignId !== campaign.id
    ) {
      return;
    }
    const node = campaign.locations.find((item) => item.id === focus.resource.id);
    if (!node) {
      onFinishResourceNavigation(focus.requestId);
      return;
    }
    setSelectedLocationId(node.id);
    setExpandedFolderIds((current) => {
      const expanded = new Set(current);
      let parentId = node.parentId;
      while (parentId) {
        expanded.add(parentId);
        parentId = campaign.locations.find((item) => item.id === parentId)?.parentId ?? null;
      }
      return expanded;
    });
  }, [campaign.id, campaign.locations, onFinishResourceNavigation, resourceNavigation]);

  useEffect(() => {
    const focus = resourceNavigation;
    if (
      focus?.resource.type !== "location" ||
      focus.resource.campaignId !== campaign.id
    ) {
      return;
    }
    if (selectedLocationId === focus.resource.id) {
      document.getElementById(`resource-location-${selectedLocationId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      onFinishResourceNavigation(focus.requestId);
    }
  }, [
    campaign.id,
    onFinishResourceNavigation,
    resourceNavigation,
    selectedLocationId,
  ]);

  function startCreate(kind: LocationNode["kind"], parentId: string | null) {
    setCreating({ kind, parentId });
    setName("");
    setNotes(createEmptyResourceNotes());
    if (parentId) {
      setExpandedFolderIds((current) => new Set(current).add(parentId));
    }
  }

  function submitLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !creating) return;
    const location: LocationNode = {
      id: crypto.randomUUID(),
      name: trimmedName,
      parentId: creating.parentId,
      kind: creating.kind,
      notes,
    };
    onSaveLocation(campaign.id, location);
    setSelectedLocationId(location.id);
    setCreating(null);
    setName("");
    setNotes(createEmptyResourceNotes());
  }

  function removeNode(node: LocationNode) {
    const childIds = new Set([node.id]);
    let foundChild = true;
    while (foundChild) {
      foundChild = false;
      for (const candidate of campaign.locations) {
        if (candidate.parentId && childIds.has(candidate.parentId) && !childIds.has(candidate.id)) {
          childIds.add(candidate.id);
          foundChild = true;
        }
      }
    }
    if (node.kind === "folder" && childIds.size > 1 &&
      !window.confirm(`Delete "${node.name}" and its ${childIds.size - 1} nested ${childIds.size === 2 ? "entry" : "entries"}?`)) {
      return;
    }
    if (selectedLocationId && childIds.has(selectedLocationId)) {
      setSelectedLocationId(null);
    }
    onDeleteLocation(campaign.id, node.id);
  }

  return (
    <div className="campaign-section location-section">
      <div className="location-toolbar">
        <div>
          <strong>Locations</strong>
          <small>{campaign.locations.filter((node) => node.kind === "location").length} files · {campaign.locations.filter((node) => node.kind === "folder").length} folders</small>
        </div>
        <div className="location-toolbar-actions">
          <AppButton className="secondary-button" type="button" onClick={() => startCreate("folder", null)}>＋ New folder</AppButton>
          <AppButton className="secondary-button" type="button" onClick={() => startCreate("location", null)}>＋ New location</AppButton>
        </div>
      </div>

      <ul className="location-tree" aria-label={`${campaign.name} locations`}>
        {rootLocations.map((node) => (
          <LocationTreeNode
            key={node.id}
            node={node}
            children={campaign.locations
              .filter((child) => child.parentId === node.id)
              .sort((a, b) => a.name.localeCompare(b.name))}
            campaign={campaign}
            expandedFolderIds={expandedFolderIds}
            selectedLocationId={selectedLocationId}
            onToggleFolder={(folderId) => {
              setSelectedLocationId(folderId);
              setExpandedFolderIds((current) => {
                const next = new Set(current);
                if (next.has(folderId)) next.delete(folderId);
                else next.add(folderId);
                return next;
              });
            }}
            onSelectLocation={setSelectedLocationId}
            onCreate={startCreate}
            onDelete={removeNode}
          />
        ))}
        {rootLocations.length === 0 && (
          <li className="location-tree-empty">No files or folders yet. Create one above.</li>
        )}
      </ul>

      {creating && (
        <form className="location-form" onSubmit={submitLocation}>
          <div className="location-form-heading">
            <h3>New {creating.kind === "folder" ? "folder" : "location"}</h3>
            <AppButton className="subtle-button" type="button" onClick={() => setCreating(null)}>Cancel</AppButton>
          </div>
          <p className="muted-copy">
            {creating.parentId
              ? `Inside ${campaign.locations.find((node) => node.id === creating.parentId)?.name ?? "folder"}`
              : "At the campaign root"}
          </p>
          <TextInput
            className="form-field"
            label="Name *"
            autoFocus
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            required
          />
          <ResourceNotes
            value={notes}
            resources={resources}
            onOpenResource={onOpenResource}
            onChange={setNotes}
          />
          <AppButton className="primary-button" type="submit">
            Create {creating.kind === "folder" ? "folder" : "location"}
          </AppButton>
        </form>
      )}

      {selectedLocation && (
        <section className="location-detail">
          <div className="location-detail-heading">
            <div>
              <p className="eyebrow">{selectedLocation.kind === "folder" ? "FOLDER" : "LOCATION"}</p>
              <h3>{selectedLocation.name}</h3>
            </div>
            <AppButton className="danger-text-button" type="button" onClick={() => removeNode(selectedLocation)}>Delete</AppButton>
          </div>
          <ResourceNotes
            value={selectedLocation.notes}
            resources={resources}
            onOpenResource={onOpenResource}
            onChange={(updatedNotes) =>
              onSaveLocation(campaign.id, { ...selectedLocation, notes: updatedNotes })
            }
          />
        </section>
      )}
    </div>
  );
}

function LocationTreeNode({
  node,
  children,
  campaign,
  expandedFolderIds,
  selectedLocationId,
  onToggleFolder,
  onSelectLocation,
  onCreate,
  onDelete,
}: {
  node: LocationNode;
  children: LocationNode[];
  campaign: Campaign;
  expandedFolderIds: Set<string>;
  selectedLocationId: string | null;
  onToggleFolder: (folderId: string) => void;
  onSelectLocation: (locationId: string) => void;
  onCreate: (kind: LocationNode["kind"], parentId: string | null) => void;
  onDelete: (node: LocationNode) => void;
}) {
  const isFolder = node.kind === "folder";
  const isExpanded = expandedFolderIds.has(node.id);
  const isSelected = selectedLocationId === node.id;

  return (
    <li
      className={`location-tree-item${isSelected ? " selected" : ""}`}
      id={`resource-location-${node.id}`}
    >
      <div className="location-tree-row">
        {isFolder ? (
          <AppButton
            className="location-tree-expander"
            type="button"
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.name}`}
            aria-expanded={isExpanded}
            onClick={() => onToggleFolder(node.id)}
          >
            {isExpanded ? "▾" : "▸"}
          </AppButton>
        ) : (
          <span className="location-tree-expander-spacer" aria-hidden="true" />
        )}
        <AppButton
          className="location-tree-name"
          type="button"
          onClick={() => isFolder ? onToggleFolder(node.id) : onSelectLocation(node.id)}
        >
          <span className="location-tree-icon" aria-hidden="true">
            {isFolder ? "▰" : "⌖"}
          </span>
          <span>{node.name}</span>
        </AppButton>
        <div className="location-tree-actions">
          {isFolder && (
            <>
              <AppButton
                type="button"
                title={`New folder inside ${node.name}`}
                aria-label={`New folder inside ${node.name}`}
                onClick={() => onCreate("folder", node.id)}
              >
                ＋ Folder
              </AppButton>
              <AppButton
                type="button"
                title={`New location inside ${node.name}`}
                aria-label={`New location inside ${node.name}`}
                onClick={() => onCreate("location", node.id)}
              >
                ＋ Location
              </AppButton>
            </>
          )}
          <AppButton
            className="location-tree-delete"
            type="button"
            aria-label={`Delete ${node.name}`}
            onClick={() => onDelete(node)}
          >
            ×
          </AppButton>
        </div>
      </div>
      {isFolder && isExpanded && children.length > 0 && (
        <ul className="location-tree-children">
          {children.map((child) => (
            <LocationTreeNode
              key={child.id}
              node={child}
              children={campaign.locations
                .filter((item) => item.parentId === child.id)
                .sort((a, b) => a.name.localeCompare(b.name))}
              campaign={campaign}
              expandedFolderIds={expandedFolderIds}
              selectedLocationId={selectedLocationId}
              onToggleFolder={onToggleFolder}
              onSelectLocation={onSelectLocation}
              onCreate={onCreate}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

