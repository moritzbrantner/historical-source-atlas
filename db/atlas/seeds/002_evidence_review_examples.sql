create or replace function pg_temp.seed_dead_sea_scrolls_evidence()
returns void
language plpgsql
as $$
declare
  catalog_entity_id uuid;
  catalog_record_id uuid;
  edition_entity_id uuid;
  edition_id uuid;
  physical_object_id uuid;
  search_text text;
  start_offset int;
  teacher_entity_id uuid;
  text_work_entity_id uuid;
  text_work_id uuid;
  unit_one_content text := 'The Teacher of Righteousness gathered the community in the wilderness and taught them to seek the law.';
  unit_one_id uuid;
  unit_two_content text := 'They shall separate from the habitation of unjust men and prepare the way in the desert.';
  unit_two_id uuid;
  witness_entity_id uuid;
  witness_id uuid;
begin
  select
    cr.id,
    cr.entity_id
  into catalog_record_id, catalog_entity_id
  from catalog_records cr
  join entities e on e.id = cr.entity_id
  where e.slug = 'dead-sea-scrolls';

  if catalog_record_id is null then
    raise notice 'Skipping evidence seed because dead-sea-scrolls catalog record does not exist.';
    return;
  end if;

  select po.id
  into physical_object_id
  from physical_objects po
  join entities e on e.id = po.entity_id
  where e.slug = 'dead-sea-scrolls-object';

  if physical_object_id is null then
    raise notice 'Skipping evidence seed because dead-sea-scrolls object does not exist.';
    return;
  end if;

  delete from entities
  where slug = any(array[
    'dead-sea-scrolls-evidence-work',
    'dead-sea-scrolls-evidence-witness',
    'dead-sea-scrolls-evidence-edition',
    'teacher-of-righteousness'
  ]);

  insert into entities (type, slug, preferred_label, summary, editorial_status)
  values (
    'text_work',
    'dead-sea-scrolls-evidence-work',
    'Community Rule excerpts',
    'Representative evidence text for reviewing Dead Sea Scrolls passages.',
    'published'
  )
  returning id into text_work_entity_id;

  insert into text_works (
    entity_id,
    canonical_title,
    work_type,
    language_original,
    date_label,
    abstract
  )
  values (
    text_work_entity_id,
    'Community Rule excerpts',
    'rule text',
    'Hebrew',
    '1st century BCE copies',
    'Short excerpts used to demonstrate read-only evidence overlays.'
  )
  returning id into text_work_id;

  insert into entities (type, slug, preferred_label, summary, editorial_status)
  values (
    'text_witness',
    'dead-sea-scrolls-evidence-witness',
    'Community Rule witness',
    'Illustrative witness attached to the Dead Sea Scrolls atlas record.',
    'published'
  )
  returning id into witness_entity_id;

  insert into text_witnesses (
    entity_id,
    text_work_id,
    physical_object_id,
    siglum,
    witness_type,
    language,
    script,
    date_label
  )
  values (
    witness_entity_id,
    text_work_id,
    physical_object_id,
    '1QS',
    'manuscript excerpt',
    'Hebrew',
    'Herodian',
    '1st century BCE'
  )
  returning id into witness_id;

  insert into entities (type, slug, preferred_label, summary, editorial_status)
  values (
    'text_edition',
    'dead-sea-scrolls-evidence-edition',
    'Community Rule review text',
    'Public text edition used by the evidence review panel.',
    'published'
  )
  returning id into edition_entity_id;

  insert into text_editions (
    entity_id,
    text_witness_id,
    edition_type,
    language,
    script,
    editorial_policy,
    version_label,
    is_public
  )
  values (
    edition_entity_id,
    witness_id,
    'translation',
    'en',
    'Latin',
    'Representative English text for UI review only.',
    'Evidence fixture v1',
    true
  )
  returning id into edition_id;

  insert into catalog_record_links (catalog_record_id, entity_id, role, sequence)
  values (catalog_record_id, edition_entity_id, 'evidence_text_edition', 0)
  on conflict do nothing;

  insert into text_units (
    text_edition_id,
    unit_type,
    label,
    sequence,
    content
  )
  values (
    edition_id,
    'line',
    '1QS I, excerpt',
    1,
    unit_one_content
  )
  returning id into unit_one_id;

  insert into text_units (
    text_edition_id,
    unit_type,
    label,
    sequence,
    content,
    note
  )
  values (
    edition_id,
    'line',
    '1QS VIII, excerpt',
    2,
    unit_two_content,
    'Representative English text for demonstrating source review overlays.'
  )
  returning id into unit_two_id;

  insert into entities (type, slug, preferred_label, summary, editorial_status)
  values (
    'agent',
    'teacher-of-righteousness',
    'Teacher of Righteousness',
    'A sectarian leader named in several Qumran texts.',
    'published'
  )
  returning id into teacher_entity_id;

  insert into agents (
    entity_id,
    agent_type,
    name,
    date_label,
    date_precision
  )
  values (
    teacher_entity_id,
    'person',
    'Teacher of Righteousness',
    '2nd-1st century BCE',
    'range'
  );

  search_text := 'Teacher of Righteousness';
  start_offset := position(search_text in unit_one_content) - 1;
  insert into entity_mentions (
    text_unit_id,
    entity_id,
    mention_text,
    start_offset,
    end_offset,
    certainty,
    source,
    note
  )
  values (
    unit_one_id,
    teacher_entity_id,
    search_text,
    start_offset,
    start_offset + length(search_text),
    'illustrative fixture',
    'seed',
    'A sectarian leader named in several Qumran texts.'
  );

  insert into entity_relations (
    subject_entity_id,
    predicate,
    object_entity_id,
    certainty,
    note
  )
  values (
    teacher_entity_id,
    'mentioned in',
    text_work_entity_id,
    'illustrative fixture',
    'Named in representative Community Rule evidence text.'
  );

  search_text := 'community in the wilderness';
  start_offset := position(search_text in unit_one_content) - 1;
  insert into text_annotations (
    text_unit_id,
    annotation_type,
    start_offset,
    end_offset,
    content,
    certainty
  )
  values (
    unit_one_id,
    'important',
    start_offset,
    start_offset + length(search_text),
    'The wilderness setting connects the passage to withdrawal and communal discipline.',
    'illustrative fixture'
  );

  search_text := 'seek the law';
  start_offset := position(search_text in unit_one_content) - 1;
  insert into text_annotations (
    text_unit_id,
    annotation_type,
    start_offset,
    end_offset,
    content,
    certainty
  )
  values (
    unit_one_id,
    'translation',
    start_offset,
    start_offset + length(search_text),
    'Interpretive rendering: study and obey the law.',
    'illustrative fixture'
  );

  search_text := 'separate from the habitation';
  start_offset := position(search_text in unit_two_content) - 1;
  insert into text_annotations (
    text_unit_id,
    annotation_type,
    start_offset,
    end_offset,
    content,
    certainty
  )
  values (
    unit_two_id,
    'note',
    start_offset,
    start_offset + length(search_text),
    'This phrase marks social and ritual separation as a communal boundary.',
    'illustrative fixture'
  );

  search_text := 'prepare the way in the desert';
  start_offset := position(search_text in unit_two_content) - 1;
  insert into text_annotations (
    text_unit_id,
    annotation_type,
    start_offset,
    end_offset,
    content,
    certainty
  )
  values (
    unit_two_id,
    'highlight',
    start_offset,
    start_offset + length(search_text),
    'Echoes the biblical preparation motif used in Qumran self-description.',
    'illustrative fixture'
  );
end;
$$;

select pg_temp.seed_dead_sea_scrolls_evidence();
