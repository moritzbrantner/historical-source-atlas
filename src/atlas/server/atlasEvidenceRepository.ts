import { getPool } from '@/src/db/client';

import type {
  EvidenceLayerId,
  EvidenceOverlay,
  EvidenceOverlayKind,
  EvidenceReview,
  EvidenceTextUnit,
} from '../entities/evidence/model/evidenceTypes';
import { evidenceOverlayLayers } from '../entities/evidence/model/evidenceTypes';

type SourceRow = {
  id: string;
  label: string;
  slug: string;
};

type TextUnitRow = {
  content: string | null;
  id: string;
  label: string | null;
  note: string | null;
  sequence: number;
  unit_type: string;
};

type TextAnnotationRow = {
  annotation_type: string;
  certainty: string | null;
  content: string | null;
  end_offset: number | null;
  id: string;
  start_offset: number | null;
  text_unit_id: string;
};

type EntityMentionRow = {
  certainty: string | null;
  end_offset: number | null;
  entity_id: string;
  entity_label: string;
  entity_slug: string;
  entity_type: string;
  id: string;
  mention_text: string;
  note: string | null;
  start_offset: number | null;
  text_unit_id: string;
};

type AnnotationMapping = {
  kind: EvidenceOverlayKind;
  label: string;
  layerId: EvidenceLayerId;
};

export async function getAtlasEvidenceReviewFromDb(slug: string) {
  const pool = getPool();
  const { rows: sourceRows } = await pool.query<SourceRow>(
    `
      select
        cards.id::text,
        cards.slug,
        cards.label
      from atlas_source_cards cards
      where cards.slug = $1
    `,
    [slug],
  );
  const source = sourceRows[0];

  if (!source) {
    return null;
  }

  const units = await readEvidenceUnits(source.id);

  return {
    layers: evidenceOverlayLayers,
    sourceSlug: source.slug,
    title: `${source.label} evidence review`,
    units,
  } satisfies EvidenceReview;
}

async function readEvidenceUnits(catalogRecordId: string) {
  const pool = getPool();
  const { rows: unitRows } = await pool.query<TextUnitRow>(
    `
      select
        tu.id::text,
        tu.unit_type,
        tu.label,
        tu.sequence,
        tu.content,
        tu.note
      from catalog_record_links link
      join text_editions te on te.entity_id = link.entity_id
      join text_units tu on tu.text_edition_id = te.id
      where link.catalog_record_id = $1::uuid
        and link.role = 'evidence_text_edition'
        and te.is_public = true
      order by tu.sequence, tu.id::text
    `,
    [catalogRecordId],
  );

  if (unitRows.length === 0) {
    return [];
  }

  const unitIds = unitRows.map((unit) => unit.id);
  const [annotationRows, mentionRows] = await Promise.all([
    readTextAnnotations(unitIds),
    readEntityMentions(unitIds),
  ]);
  const overlaysByUnit = new Map<string, EvidenceOverlay[]>();

  for (const row of annotationRows) {
    const unit = unitRows.find(
      (candidate) => candidate.id === row.text_unit_id,
    );
    const mapping = mapAnnotation(row.annotation_type);

    if (!unit || !mapping || !unit.content) {
      continue;
    }

    const overlay = createOverlay({
      certainty: row.certainty,
      content: row.content,
      endOffset: row.end_offset,
      id: row.id,
      kind: mapping.kind,
      label: mapping.label,
      layerId: mapping.layerId,
      startOffset: row.start_offset,
      unitContent: unit.content,
      unitId: row.text_unit_id,
    });

    if (overlay) {
      appendOverlay(overlaysByUnit, row.text_unit_id, overlay);
    }
  }

  for (const row of mentionRows) {
    const unit = unitRows.find(
      (candidate) => candidate.id === row.text_unit_id,
    );

    if (!unit?.content) {
      continue;
    }

    const overlay = createOverlay({
      certainty: row.certainty,
      content: row.note,
      endOffset: row.end_offset,
      id: row.id,
      kind: 'entity',
      label: row.mention_text,
      layerId: 'entities',
      startOffset: row.start_offset,
      targetEntityId: row.entity_id,
      targetEntityLabel: row.entity_label,
      targetEntitySlug: row.entity_slug,
      targetEntityType: row.entity_type,
      unitContent: unit.content,
      unitId: row.text_unit_id,
    });

    if (overlay) {
      appendOverlay(overlaysByUnit, row.text_unit_id, overlay);
    }
  }

  return unitRows
    .filter((unit) => unit.content?.trim())
    .map(
      (unit): EvidenceTextUnit => ({
        content: unit.content ?? '',
        id: unit.id,
        label: unit.label,
        note: unit.note,
        overlays: overlaysByUnit.get(unit.id) ?? [],
        sequence: unit.sequence,
        unitType: unit.unit_type,
      }),
    );
}

async function readTextAnnotations(unitIds: string[]) {
  const pool = getPool();
  const { rows } = await pool.query<TextAnnotationRow>(
    `
      select
        ta.id::text,
        ta.text_unit_id::text,
        ta.annotation_type,
        ta.start_offset,
        ta.end_offset,
        ta.content,
        ta.certainty
      from text_annotations ta
      where ta.text_unit_id = any($1::uuid[])
      order by ta.created_at, ta.id::text
    `,
    [unitIds],
  );

  return rows;
}

async function readEntityMentions(unitIds: string[]) {
  const pool = getPool();
  const { rows } = await pool.query<EntityMentionRow>(
    `
      select
        em.id::text,
        em.text_unit_id::text,
        em.entity_id::text,
        e.preferred_label as entity_label,
        e.slug as entity_slug,
        e.type::text as entity_type,
        em.mention_text,
        em.start_offset,
        em.end_offset,
        em.certainty,
        em.note
      from entity_mentions em
      join entities e on e.id = em.entity_id
      where em.text_unit_id = any($1::uuid[])
      order by em.created_at, em.id::text
    `,
    [unitIds],
  );

  return rows;
}

function createOverlay({
  certainty,
  content,
  endOffset,
  id,
  kind,
  label,
  layerId,
  startOffset,
  targetEntityId,
  targetEntityLabel,
  targetEntitySlug,
  targetEntityType,
  unitContent,
  unitId,
}: {
  certainty: string | null;
  content: string | null;
  endOffset: number | null;
  id: string;
  kind: EvidenceOverlayKind;
  label: string;
  layerId: EvidenceLayerId;
  startOffset: number | null;
  targetEntityId?: string | null;
  targetEntityLabel?: string | null;
  targetEntitySlug?: string | null;
  targetEntityType?: string | null;
  unitContent: string;
  unitId: string;
}): EvidenceOverlay | null {
  if (
    startOffset === null ||
    endOffset === null ||
    startOffset < 0 ||
    endOffset < 0 ||
    startOffset >= endOffset ||
    endOffset > unitContent.length
  ) {
    return null;
  }

  return {
    certainty,
    content,
    endOffset,
    id,
    kind,
    label,
    layerId,
    startOffset,
    targetEntityId,
    targetEntityLabel,
    targetEntitySlug,
    targetEntityType,
    unitId,
  };
}

function appendOverlay(
  overlaysByUnit: Map<string, EvidenceOverlay[]>,
  unitId: string,
  overlay: EvidenceOverlay,
) {
  const overlays = overlaysByUnit.get(unitId) ?? [];
  overlays.push(overlay);
  overlaysByUnit.set(unitId, overlays);
}

function mapAnnotation(annotationType: string): AnnotationMapping | null {
  const normalizedType = annotationType.trim().toLowerCase();

  if (normalizedType === 'important' || normalizedType === 'highlight') {
    return {
      kind: 'highlight',
      label: 'Important passage',
      layerId: 'important',
    };
  }

  if (normalizedType === 'translation') {
    return {
      kind: 'translation',
      label: 'Translation',
      layerId: 'translation',
    };
  }

  if (normalizedType === 'note' || normalizedType === 'commentary') {
    return {
      kind: 'note',
      label: 'Editorial note',
      layerId: 'notes',
    };
  }

  return null;
}
