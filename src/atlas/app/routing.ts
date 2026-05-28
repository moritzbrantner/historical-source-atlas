export function getSourcePath(sourceId: string) {
  return `/atlas/sources/${encodeURIComponent(sourceId)}`;
}
