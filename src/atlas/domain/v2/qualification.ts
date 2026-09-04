declare const historicalYearBrand: unique symbol;

export type HistoricalYear = number & {
  readonly [historicalYearBrand]: 'HistoricalYear';
};

export type TemporalPrecision =
  | 'exact'
  | 'year'
  | 'range'
  | 'century'
  | 'circa'
  | 'unknown';

export type TemporalQualification = {
  readonly startYear?: HistoricalYear;
  readonly endYear?: HistoricalYear;
  readonly precision: TemporalPrecision;
  readonly label?: string;
};

export type CertaintyLevel =
  | 'certain'
  | 'probable'
  | 'possible'
  | 'uncertain'
  | 'unknown';

export type Certainty = {
  readonly level: CertaintyLevel;
  readonly note?: string;
};

export function historicalYear(value: number): HistoricalYear {
  if (!Number.isInteger(value) || value === 0) {
    throw new Error('Historical years must be non-zero integers.');
  }

  return value as HistoricalYear;
}

export function temporalQualification(input: {
  readonly startYear?: number;
  readonly endYear?: number;
  readonly precision?: TemporalPrecision;
  readonly label?: string;
}): TemporalQualification {
  const startYear =
    input.startYear === undefined ? undefined : historicalYear(input.startYear);
  const endYear =
    input.endYear === undefined ? undefined : historicalYear(input.endYear);

  if (startYear !== undefined && endYear !== undefined && startYear > endYear) {
    throw new Error('Temporal qualification start must not follow its end.');
  }

  const label = input.label?.trim();
  return Object.freeze({
    ...(startYear === undefined ? {} : { startYear }),
    ...(endYear === undefined ? {} : { endYear }),
    precision: input.precision ?? 'unknown',
    ...(label ? { label } : {}),
  });
}

export function certainty(level: CertaintyLevel, note?: string): Certainty {
  const normalizedNote = note?.trim();
  return Object.freeze({
    level,
    ...(normalizedNote ? { note: normalizedNote } : {}),
  });
}
