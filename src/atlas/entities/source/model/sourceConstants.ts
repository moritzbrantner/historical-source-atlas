import type { RecordKind } from '../../../domain/dataModel';
import { atlasSourceKindEntries } from '../../../domain/atlasTaxonomy';

export const allSourceKinds = Object.values(atlasSourceKindEntries)
  .sort((left, right) => left.order - right.order)
  .map((entry) => entry.id) as readonly RecordKind[];

export const sourceKindLabels = Object.fromEntries(
  Object.entries(atlasSourceKindEntries).map(([kind, entry]) => [
    kind,
    entry.label,
  ]),
) as Record<RecordKind, string>;

export const sourceKindColors = Object.fromEntries(
  Object.entries(atlasSourceKindEntries).map(([kind, entry]) => [
    kind,
    entry.color,
  ]),
) as Record<RecordKind, string>;
