// Extracts an album number from a Drive folder name.
//
// Folder names begin with a 1-3 digit number (e.g. "01 קטמנדו",
// "37 - יאנגשואו / קיין", "88 פוקט"). Returns the leading number or null
// for non-album folders: the .temp/.temp_N hidden folders + the "export"
// folder the user told us to ignore.

export function extractAlbumNumber(folderName) {
  if (typeof folderName !== 'string' || folderName.length === 0) return null;
  if (folderName.startsWith('.')) return null;
  if (/^export/i.test(folderName)) return null;
  const match = folderName.match(/^(\d{1,3})/);
  if (!match) return null;
  return parseInt(match[1], 10);
}
