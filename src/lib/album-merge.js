// Merges Drive folders that resolve to the same album ID into one album.
//
// The Drive folder has at least one case ("14" + "14a", both Bhagsu in
// India) where two folders share an album number. They represent the same
// place, split for storage convenience. Per user decision, they merge into
// a single album in the manifest.
//
// Input: array of { id, name, folderId, photos } from the raw Drive walk.
// Output: array of { id, name, folderIds, photos } where folders with the
// same `id` are collapsed. Display `name` is taken from the FIRST folder
// encountered, `folderIds` retains all sources for auditability, and
// `photos` arrays are concatenated (sorting is the caller's responsibility).

export function mergeFolders(folders) {
  const byId = new Map();
  for (const f of folders) {
    const existing = byId.get(f.id);
    if (!existing) {
      byId.set(f.id, {
        id: f.id,
        name: f.name,
        folderIds: [f.folderId],
        photos: [...f.photos],
      });
    } else {
      existing.folderIds.push(f.folderId);
      existing.photos.push(...f.photos);
    }
  }
  return [...byId.values()];
}
