import { useState } from "react";
import { FileButton } from "@mantine/core";
import AppButton from "./app-button.component";
import { imageUrl, MAX_IMAGE_BYTES, uploadImage } from "../workspace-storage.service";

interface ImageUploadProps {
  imageId: string | null;
  onChange: (imageId: string | null) => void;
  label: string;
  variant?: "profile" | "note";
}

function ImageUpload({
  imageId,
  onChange,
  label,
  variant = "note",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(file: File | null) {
    if (!file) return;

    setError("");
    setUploading(true);
    try {
      onChange(await uploadImage(file));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The image could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`image-upload image-upload-${variant}`}>
      {imageId ? (
        <img className="image-upload-preview" src={imageUrl(imageId)} alt="" />
      ) : null}
      <FileButton
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={uploading}
      >
        {(buttonProps) => (
          <AppButton
            {...buttonProps}
            className="subtle-button image-upload-button"
            type="button"
            loading={uploading}
            aria-label={label}
          >
            {uploading ? "Uploading…" : label}
          </AppButton>
        )}
      </FileButton>
      {imageId && (
        <AppButton
          className="danger-text-button"
          type="button"
          onClick={() => onChange(null)}
          disabled={uploading}
        >
          Remove
        </AppButton>
      )}
      {error && <p className="form-error image-upload-error" role="alert">{error}</p>}
      {variant === "note" && (
        <span className="image-upload-hint">JPEG, PNG, WebP, or GIF; up to {MAX_IMAGE_BYTES / 1024 / 1024} MB.</span>
      )}
    </div>
  );
}

export default ImageUpload;
