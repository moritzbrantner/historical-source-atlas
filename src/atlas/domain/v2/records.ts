import type {
  DigitalRef,
  DocumentaryRef,
  HistoricalRef,
  TextualRef,
} from './reference';

export type DocumentarySourceKind =
  | 'manuscript'
  | 'inscription'
  | 'artifact'
  | 'archive'
  | 'collection'
  | 'other';

export type DocumentarySource = {
  readonly ref: DocumentaryRef<'source'>;
  readonly label: string;
  readonly sourceKind: DocumentarySourceKind;
  readonly summary?: string;
};

export type SourcePart = {
  readonly ref: DocumentaryRef<'source-part'>;
  readonly label: string;
  readonly parent: DocumentaryRef;
  readonly summary?: string;
};

export type DocumentaryRecord = DocumentarySource | SourcePart;

export type TextWork = {
  readonly ref: TextualRef<'work'>;
  readonly label: string;
  readonly summary?: string;
};

export type TextWitness = {
  readonly ref: TextualRef<'witness'>;
  readonly label: string;
  readonly work: TextualRef<'work'>;
  readonly carrier: DocumentaryRef;
};

export type EditionKind =
  | 'transcription'
  | 'transliteration'
  | 'translation'
  | 'normalized-text'
  | 'commentary';

export type TextEdition = {
  readonly ref: TextualRef<'edition'>;
  readonly label: string;
  readonly witness: TextualRef<'witness'>;
  readonly editionKind: EditionKind;
};

export type TextUnit = {
  readonly ref: TextualRef<'text-unit'>;
  readonly label?: string;
  readonly edition: TextualRef<'edition'>;
  readonly parent?: TextualRef<'text-unit'>;
  readonly sequence?: number;
};

export type TextualRecord = TextWork | TextWitness | TextEdition | TextUnit;

export type HistoricalEntity = {
  readonly ref: HistoricalRef;
  readonly label: string;
  readonly summary?: string;
};

export type DigitalAssetKind =
  | 'image'
  | 'pdf'
  | 'iiif-manifest'
  | 'scan'
  | 'ocr'
  | 'derived'
  | 'other';

export type DigitalAsset = {
  readonly ref: DigitalRef<'asset'>;
  readonly label?: string;
  readonly assetKind: DigitalAssetKind;
  readonly sourceUrl?: string;
};
