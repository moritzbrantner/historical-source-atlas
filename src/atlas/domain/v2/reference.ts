export type DocumentaryKind = 'source' | 'source-part';
export type TextualKind = 'work' | 'witness' | 'edition' | 'text-unit';
export type HistoricalKind =
  | 'person'
  | 'group'
  | 'institution'
  | 'place'
  | 'event'
  | 'polity'
  | 'object'
  | 'other';
export type EvidenceKind = 'observation' | 'annotation' | 'assertion';
export type DigitalKind = 'asset';

export type DomainSpace =
  | 'documentary'
  | 'textual'
  | 'historical'
  | 'evidence'
  | 'digital';

export type DomainRef<
  TSpace extends DomainSpace = DomainSpace,
  TKind extends string = string,
> = {
  readonly space: TSpace;
  readonly kind: TKind;
  readonly id: string;
};

export type DocumentaryRef<TKind extends DocumentaryKind = DocumentaryKind> =
  DomainRef<'documentary', TKind>;
export type TextualRef<TKind extends TextualKind = TextualKind> = DomainRef<
  'textual',
  TKind
>;
export type HistoricalRef<TKind extends HistoricalKind = HistoricalKind> =
  DomainRef<'historical', TKind>;
export type EvidenceRef<TKind extends EvidenceKind = EvidenceKind> = DomainRef<
  'evidence',
  TKind
>;
export type DigitalRef<TKind extends DigitalKind = DigitalKind> = DomainRef<
  'digital',
  TKind
>;

export type AtlasDomainRef =
  | DocumentaryRef
  | TextualRef
  | HistoricalRef
  | EvidenceRef
  | DigitalRef;

function domainRef<TSpace extends DomainSpace, TKind extends string>(
  space: TSpace,
  kind: TKind,
  id: string,
): DomainRef<TSpace, TKind> {
  const normalizedId = id.trim();
  if (!normalizedId) {
    throw new Error('Domain reference id must not be blank.');
  }

  return Object.freeze({ space, kind, id: normalizedId });
}

export function documentaryRef<TKind extends DocumentaryKind>(
  kind: TKind,
  id: string,
): DocumentaryRef<TKind> {
  return domainRef('documentary', kind, id);
}

export function textualRef<TKind extends TextualKind>(
  kind: TKind,
  id: string,
): TextualRef<TKind> {
  return domainRef('textual', kind, id);
}

export function historicalRef<TKind extends HistoricalKind>(
  kind: TKind,
  id: string,
): HistoricalRef<TKind> {
  return domainRef('historical', kind, id);
}

export function evidenceRef<TKind extends EvidenceKind>(
  kind: TKind,
  id: string,
): EvidenceRef<TKind> {
  return domainRef('evidence', kind, id);
}

export function digitalRef<TKind extends DigitalKind>(
  kind: TKind,
  id: string,
): DigitalRef<TKind> {
  return domainRef('digital', kind, id);
}

export function refKey(ref: AtlasDomainRef): string {
  return `${ref.space}:${ref.kind}:${ref.id}`;
}

export function compareCodePoints(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

export function compareRefs(
  left: AtlasDomainRef,
  right: AtlasDomainRef,
): number {
  return compareCodePoints(refKey(left), refKey(right));
}
