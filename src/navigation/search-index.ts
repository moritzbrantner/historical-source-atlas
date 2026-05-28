export function normalizeNavigationSearchText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function buildNavigationSearchText(parts: readonly string[]) {
  return normalizeNavigationSearchText(parts.filter(Boolean).join(' '));
}
