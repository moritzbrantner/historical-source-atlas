export function getSourcePath(sourceId: string) {
  return `/atlas/sources/${encodeURIComponent(sourceId)}`;
}

export function getSourceReferenceNetworkPath(sourceId: string) {
  return `${getSourcePath(sourceId)}/reference-network`;
}

export function getSourceComparisonPath(sourceId: string) {
  return `${getSourcePath(sourceId)}/compare`;
}
