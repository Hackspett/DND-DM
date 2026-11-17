import { useId, useState } from "react";
import { NativeSelect, TextInput, Textarea } from "@mantine/core";
import AppButton from "./app-button.component";
import type { ResourceLink, ResourceNotes as ResourceNotesValue, ResourceOption, ResourceType } from "../workspace.types";
import ImageUpload from "./image-upload.component";
import { imageUrl } from "../workspace-storage.service";

const resourceKinds: { type: ResourceType; label: string }[] = [
  { type: "campaign", label: "Campaign" },
  { type: "player", label: "Player" },
  { type: "npc", label: "NPC" },
  { type: "location", label: "Location or folder" },
  { type: "battle", label: "Saved battle" },
  { type: "monster", label: "Monster" },
  { type: "item", label: "Item" },
  { type: "gear", label: "Gear" },
  { type: "effect", label: "Effect" },
];

interface ResourceNotesProps {
  value: ResourceNotesValue;
  resources: ResourceOption[];
  onOpenResource: (resource: ResourceLink) => void;
  onChange?: (value: ResourceNotesValue) => void;
  label?: string;
}

function ResourceNotes({
  value,
  resources,
  onOpenResource,
  onChange,
  label = "Notes",
}: ResourceNotesProps) {
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [selectedType, setSelectedType] = useState<ResourceType>("campaign");
  const [selectedResourceKey, setSelectedResourceKey] = useState("");
  const options = resources.filter((resource) => resource.type === selectedType);
  const selectedResource = options.find(
    (resource) => getResourceKey(resource) === selectedResourceKey,
  );
  const editable = onChange !== undefined;

  function addResourceLink() {
    if (!selectedResource || !onChange) return;
    const alreadyLinked = value.links.some(
      (link) => getResourceKey(link) === getResourceKey(selectedResource),
    );
    if (!alreadyLinked) {
      onChange({
        ...value,
        links: [...value.links, {
          type: selectedResource.type,
          id: selectedResource.id,
          campaignId: selectedResource.campaignId,
          label: selectedResource.label,
        }],
      });
    }
    setSelectedResourceKey("");
    setIsAddingLink(false);
  }

  function removeResourceLink(resource: ResourceLink) {
    onChange?.({
      ...value,
      links: value.links.filter(
        (link) => getResourceKey(link) !== getResourceKey(resource),
      ),
    });
  }

  function addImage(imageId: string | null) {
    if (!imageId) return;
    onChange?.({
      ...value,
      images: [...value.images, { id: imageId, altText: "" }],
    });
  }

  return (
    <div className={`resource-notes${editable ? " editable" : ""}`}>
      {editable ? (
        <Textarea
          className="form-field"
          label={label}
          rows={4}
          value={value.text}
          onChange={(event) => onChange({
            ...value,
            text: event.currentTarget.value,
          })}
          placeholder="Write any details you want to remember…"
        />
      ) : (
        value.text && <p className="resource-notes-text">{value.text}</p>
      )}

      {value.images.length > 0 && (
        <div className="resource-note-images">
          {value.images.map((image) => (
            <figure className="resource-note-image" key={image.id}>
              <img
                src={imageUrl(image.id)}
                alt={image.altText || "Attached note"}
              />
              {editable ? (
                <div className="resource-note-image-controls">
                  <TextInput
                    className="form-field"
                    label="Image description"
                    value={image.altText}
                    onChange={(event) => onChange?.({
                      ...value,
                      images: value.images.map((item) =>
                        item.id === image.id
                          ? { ...item, altText: event.currentTarget.value }
                          : item,
                      ),
                    })}
                    placeholder="Optional"
                  />
                  <AppButton
                    className="danger-text-button"
                    type="button"
                    onClick={() => onChange?.({
                      ...value,
                      images: value.images.filter((item) => item.id !== image.id),
                    })}
                  >
                    Remove image
                  </AppButton>
                </div>
              ) : (
                image.altText && <figcaption>{image.altText}</figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      {editable && (
        <ImageUpload
          imageId={null}
          onChange={addImage}
          label="＋ Add image to notes"
        />
      )}

      {value.links.length > 0 && (
        <div className="resource-note-links">
          {editable && <span className="resource-note-links-label">Linked resources</span>}
          <div className="resource-note-link-list">
            {value.links.map((link) => {
              const resource = resources.find(
                (option) => getResourceKey(option) === getResourceKey(link),
              );
              return (
                <ResourceLinkChip
                  key={getResourceKey(link)}
                  link={link}
                  resource={resource}
                  editable={editable}
                  onOpen={onOpenResource}
                  onRemove={removeResourceLink}
                />
              );
            })}
          </div>
        </div>
      )}

      {editable && (
        <div className="resource-note-link-editor">
          {!isAddingLink ? (
            <AppButton
              className="subtle-button"
              type="button"
              onClick={() => setIsAddingLink(true)}
            >
              ＋ Add link
            </AppButton>
          ) : (
            <div className="resource-note-link-controls">
              <NativeSelect
                className="form-field"
                label="Resource type"
                value={selectedType}
                onChange={(event) => {
                  const kind = resourceKinds.find((item) => item.type === event.currentTarget.value);
                  if (kind) setSelectedType(kind.type);
                  setSelectedResourceKey("");
                }}
              >
                {resourceKinds.map((kind) => (
                  <option value={kind.type} key={kind.type}>{kind.label}</option>
                ))}
              </NativeSelect>
              <NativeSelect
                className="form-field"
                label="Resource"
                value={selectedResourceKey}
                onChange={(event) => setSelectedResourceKey(event.currentTarget.value)}
              >
                <option value="">Choose a resource</option>
                {options.map((resource) => (
                  <option value={getResourceKey(resource)} key={getResourceKey(resource)}>
                    {resource.context}
                  </option>
                ))}
              </NativeSelect>
              <AppButton
                className="primary-button"
                type="button"
                disabled={!selectedResource}
                onClick={addResourceLink}
              >
                Add link
              </AppButton>
              <AppButton
                className="secondary-button"
                type="button"
                onClick={() => {
                  setIsAddingLink(false);
                  setSelectedResourceKey("");
                }}
              >
                Cancel
              </AppButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResourceLinkChip({
  link,
  resource,
  editable,
  onOpen,
  onRemove,
}: {
  link: ResourceLink;
  resource: ResourceOption | undefined;
  editable: boolean;
  onOpen: (resource: ResourceLink) => void;
  onRemove: (resource: ResourceLink) => void;
}) {
  const previewId = useId();
  const preview = resource?.preview;

  return (
    <span className="resource-note-link">
      {resource ? (
        <AppButton
          size="compact-xs"
          type="button"
          onClick={() => onOpen(link)}
          aria-describedby={preview ? previewId : undefined}
        >
          {resource.label}
        </AppButton>
      ) : (
        <span className="resource-note-link-missing">
          {link.label} (unavailable)
        </span>
      )}
      {preview && (
        <span className="resource-note-link-preview" id={previewId} role="tooltip">
          {preview.imageId && (
            <img src={imageUrl(preview.imageId)} alt="" />
          )}
          <span className="resource-note-link-preview-copy">
            <strong>{resource.label}</strong>
            <small>{preview.subtitle}</small>
            {resource.context !== resource.label && (
              <small className="resource-note-link-preview-context">{resource.context}</small>
            )}
            {preview.details.length > 0 && (
              <span className="resource-note-link-preview-details">
                {preview.details.map((detail) => <span key={detail}>{detail}</span>)}
              </span>
            )}
            <span className="resource-note-link-preview-description">
              {preview.description || "No notes yet."}
            </span>
          </span>
        </span>
      )}
      {editable && (
        <AppButton
          className="resource-note-link-remove"
          size="compact-sm"
          type="button"
          aria-label={`Remove link to ${link.label}`}
          onClick={() => onRemove(link)}
        >
          ×
        </AppButton>
      )}
    </span>
  );
}

function getResourceKey(resource: Pick<ResourceLink, "type" | "id" | "campaignId">): string {
  return JSON.stringify([resource.type, resource.campaignId, resource.id]);
}

export default ResourceNotes;
