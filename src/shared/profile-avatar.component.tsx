import { imageUrl } from "../workspace-storage.service";

interface ProfileAvatarProps {
  name: string;
  imageId: string | null;
}

function ProfileAvatar({ name, imageId }: ProfileAvatarProps) {
  if (imageId) {
    return <img className="profile-avatar-image" src={imageUrl(imageId)} alt={`${name} profile`} />;
  }
  return <span className="profile-avatar-fallback" aria-hidden="true">{getInitials(name)}</span>;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export default ProfileAvatar;
