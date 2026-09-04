create or replace function pg_temp.seed_current_atlas_source(
  p_slug text,
  p_label text,
  p_kind text,
  p_latitude double precision,
  p_longitude double precision,
  p_weight int,
  p_current_repository text,
  p_discovered_label text,
  p_discovered_year int,
  p_location text,
  p_period text,
  p_source_year int,
  p_region text,
  p_summary text,
  p_discovery_context text,
  p_referenced_in jsonb,
  p_references jsonb
)
returns void
language plpgsql
as $$
declare
  catalog_entity_id uuid;
  catalog_record_id uuid;
  discovery_entity_id uuid;
  discovery_event_id uuid;
  inscription_entity_id uuid;
  item jsonb;
  manuscript_entity_id uuid;
  object_entity_id uuid;
  physical_object_id uuid;
  place_entity_id uuid;
  place_id uuid;
  repository_agent_id uuid;
  repository_entity_id uuid;
  repository_holding_id uuid;
  text_work_entity_id uuid;
begin
  -- Text witnesses can point at carriers owned by this source with ON DELETE SET NULL.
  -- Remove their edition/witness entities first so replacing a carrier cannot violate
  -- text_witnesses_has_carrier during an idempotent seed rerun.
  delete from entities
  where id in (
    select te.entity_id
    from text_editions te
    join text_witnesses tw on tw.id = te.text_witness_id
    left join physical_objects po on po.id = tw.physical_object_id
    left join entities physical_entity on physical_entity.id = po.entity_id
    left join inscriptions inscription on inscription.id = tw.inscription_id
    left join entities inscription_entity on inscription_entity.id = inscription.entity_id
    left join manuscript_units manuscript on manuscript.id = tw.manuscript_unit_id
    left join entities manuscript_entity on manuscript_entity.id = manuscript.entity_id
    where physical_entity.slug = p_slug || '-object'
      or inscription_entity.slug = p_slug || '-inscription'
      or manuscript_entity.slug = p_slug || '-manuscript'
  );

  delete from entities
  where id in (
    select tw.entity_id
    from text_witnesses tw
    left join physical_objects po on po.id = tw.physical_object_id
    left join entities physical_entity on physical_entity.id = po.entity_id
    left join inscriptions inscription on inscription.id = tw.inscription_id
    left join entities inscription_entity on inscription_entity.id = inscription.entity_id
    left join manuscript_units manuscript on manuscript.id = tw.manuscript_unit_id
    left join entities manuscript_entity on manuscript_entity.id = manuscript.entity_id
    where physical_entity.slug = p_slug || '-object'
      or inscription_entity.slug = p_slug || '-inscription'
      or manuscript_entity.slug = p_slug || '-manuscript'
  );

  delete from entities
  where slug = any(array[
    p_slug,
    p_slug || '-place',
    p_slug || '-discovery',
    p_slug || '-repository',
    p_slug || '-object',
    p_slug || '-inscription',
    p_slug || '-manuscript',
    p_slug || '-text-work'
  ]);

  insert into entities (type, slug, preferred_label, summary, editorial_status)
  values ('catalog_record', p_slug, p_label, p_summary, 'published')
  returning id into catalog_entity_id;

  insert into entities (type, slug, preferred_label, summary, editorial_status)
  values ('place', p_slug || '-place', p_location, p_region, 'published')
  returning id into place_entity_id;

  insert into places (
    entity_id,
    name,
    place_type,
    geom,
    ancient_region,
    certainty
  )
  values (
    place_entity_id,
    p_location,
    'findspot',
    st_setsrid(st_makepoint(p_longitude, p_latitude), 4326),
    p_region,
    'derived from current static atlas coordinates'
  )
  returning id into place_id;

  insert into entities (type, slug, preferred_label, summary, editorial_status)
  values ('event', p_slug || '-discovery', p_label || ' discovery', p_discovery_context, 'published')
  returning id into discovery_entity_id;

  insert into events (
    entity_id,
    event_type,
    date_start_year,
    date_label,
    date_precision,
    place_id,
    description
  )
  values (
    discovery_entity_id,
    'discovery',
    p_discovered_year,
    p_discovered_label,
    case when p_discovered_label like '%-%' then 'range'::date_precision else 'year'::date_precision end,
    place_id,
    p_discovery_context
  )
  returning id into discovery_event_id;

  insert into catalog_records (
    entity_id,
    kind,
    display_title,
    public_summary,
    atlas_weight,
    primary_place_id,
    primary_date_start_year,
    primary_date_label,
    discovery_event_id,
    published
  )
  values (
    catalog_entity_id,
    p_kind::record_kind,
    p_label,
    p_summary,
    p_weight,
    place_id,
    p_source_year,
    p_period,
    discovery_event_id,
    true
  )
  returning id into catalog_record_id;

  insert into entities (type, slug, preferred_label, summary, editorial_status)
  values ('agent', p_slug || '-repository', p_current_repository, 'Repository or repositories from the original atlas record.', 'published')
  returning id into repository_entity_id;

  insert into agents (entity_id, agent_type, name)
  values (repository_entity_id, 'repository', p_current_repository)
  returning id into repository_agent_id;

  insert into entities (type, slug, preferred_label, summary, editorial_status)
  values ('physical_object', p_slug || '-object', p_label, p_summary, 'published')
  returning id into object_entity_id;

  insert into physical_objects (entity_id, object_type, is_composite)
  values (
    object_entity_id,
    case
      when p_kind = 'artifact' then 'artifact'
      when p_kind = 'inscription' then 'inscribed object'
      when p_kind = 'manuscript' then 'manuscript carrier'
      else 'text-bearing object or collection'
    end,
    p_kind in ('manuscript', 'text', 'collection', 'archive')
  )
  returning id into physical_object_id;

  insert into holdings (
    physical_object_id,
    repository_agent_id,
    holding_status,
    note
  )
  values (
    physical_object_id,
    repository_agent_id,
    'current',
    p_current_repository
  )
  returning id into repository_holding_id;

  update physical_objects
  set current_holding_id = repository_holding_id
  where id = physical_object_id;

  insert into catalog_record_links (catalog_record_id, entity_id, role)
  values (catalog_record_id, object_entity_id, 'primary_physical_object');

  if p_kind = 'inscription' then
    insert into entities (type, slug, preferred_label, summary, editorial_status)
    values ('inscription', p_slug || '-inscription', p_label || ' inscription', p_summary, 'published')
    returning id into inscription_entity_id;

    insert into inscriptions (entity_id, physical_object_id, inscription_type)
    values (inscription_entity_id, physical_object_id, 'inscription');

    insert into catalog_record_links (catalog_record_id, entity_id, role)
    values (catalog_record_id, inscription_entity_id, 'primary_inscription');
  elsif p_kind = 'manuscript' then
    insert into entities (type, slug, preferred_label, summary, editorial_status)
    values ('manuscript_unit', p_slug || '-manuscript', p_label || ' manuscript unit', p_summary, 'published')
    returning id into manuscript_entity_id;

    insert into manuscript_units (entity_id, physical_object_id)
    values (manuscript_entity_id, physical_object_id);

    insert into catalog_record_links (catalog_record_id, entity_id, role)
    values (catalog_record_id, manuscript_entity_id, 'primary_manuscript_unit');
  elsif p_kind = 'text' then
    insert into entities (type, slug, preferred_label, summary, editorial_status)
    values ('text_work', p_slug || '-text-work', p_label, p_summary, 'published')
    returning id into text_work_entity_id;

    insert into text_works (
      entity_id,
      canonical_title,
      work_type,
      date_start_year,
      date_label,
      abstract
    )
    values (
      text_work_entity_id,
      p_label,
      'source corpus',
      p_source_year,
      p_period,
      p_summary
    );

    insert into catalog_record_links (catalog_record_id, entity_id, role)
    values (catalog_record_id, text_work_entity_id, 'primary_text_work');
  end if;

  for item in select * from jsonb_array_elements(p_references)
  loop
    insert into entity_relations (
      subject_entity_id,
      predicate,
      object_label,
      note,
      certainty
    )
    values (
      catalog_entity_id,
      item->>'relation',
      item->>'label',
      item->>'note',
      'legacy static atlas'
    );
  end loop;

  for item in select * from jsonb_array_elements(p_referenced_in)
  loop
    insert into entity_relations (
      subject_entity_id,
      predicate,
      object_label,
      note,
      certainty
    )
    values (
      catalog_entity_id,
      'referenced in: ' || coalesce(item->>'relation', 'source'),
      item->>'label',
      item->>'note',
      'legacy static atlas'
    );
  end loop;
end;
$$;

select pg_temp.seed_current_atlas_source(
  'dead-sea-scrolls',
  'Dead Sea Scrolls',
  'manuscript',
  31.741,
  35.458,
  10,
  $$Israel Museum, Shrine of the Book and other collections$$,
  '1947-1956',
  1947,
  $$Qumran Caves, near the Dead Sea$$,
  $$3rd century BC-1st century AD$$,
  -300,
  'Levant',
  $$A large group of Jewish religious manuscripts found in caves near Qumran, including biblical and sectarian texts.$$,
  $$Bedouin shepherds and later archaeological teams recovered the scrolls from caves above Qumran on the northwest Dead Sea shore.$$,
  $$[
    {"label":"Qumran cave inventories","note":"Catalogued by cave and fragment number, then used in editions of the scroll corpus.","relation":"catalogued as"},
    {"label":"Biblical manuscript studies","note":"Used as early witnesses for Hebrew biblical books and Second Temple textual traditions.","relation":"cited in"}
  ]$$::jsonb,
  $$[
    {"label":"Hebrew Bible traditions","note":"Copies, paraphrases, and commentaries preserve variant forms of biblical books.","relation":"copies and interprets"},
    {"label":"Qumran community rules","note":"Sectarian texts describe communal discipline, ritual order, and eschatological expectation.","relation":"records"}
  ]$$::jsonb
);

select pg_temp.seed_current_atlas_source(
  'rosetta-stone',
  'Rosetta Stone',
  'inscription',
  31.404,
  30.417,
  9,
  $$British Museum$$,
  '1799',
  1799,
  $$Rashid (Rosetta), Egypt$$,
  $$196 BC$$,
  -196,
  'Egypt',
  $$A trilingual decree whose Greek, Demotic, and hieroglyphic text enabled the decipherment of Egyptian hieroglyphs.$$,
  $$French soldiers found the reused granodiorite slab while strengthening Fort Julien near Rashid during the Egyptian campaign.$$,
  $$[
    {"label":"Decipherment histories","note":"Repeatedly cited as the parallel-text key for reading Egyptian hieroglyphs.","relation":"cited in"},
    {"label":"British Museum catalogues","note":"Listed as a Ptolemaic decree and one of the museum's central epigraphic objects.","relation":"catalogued in"}
  ]$$::jsonb,
  $$[
    {"label":"Ptolemy V Epiphanes","note":"The decree praises the king and confirms temple privileges.","relation":"commemorates"},
    {"label":"Greek, Demotic, and hieroglyphic scripts","note":"The same decree is written in three scripts, enabling cross-reading.","relation":"parallels"}
  ]$$::jsonb
);

select pg_temp.seed_current_atlas_source(
  'nag-hammadi-codices',
  'Nag Hammadi Codices',
  'manuscript',
  26.052,
  32.241,
  8,
  $$Coptic Museum, Cairo$$,
  '1945',
  1945,
  $$Near Nag Hammadi, Egypt$$,
  $$4th century AD copies$$,
  300,
  'Egypt',
  $$Thirteen Coptic papyrus codices preserving early Christian and Gnostic writings.$$,
  $$Local farmers uncovered a sealed jar containing papyrus codices near Jabal al-Tarif, north of Nag Hammadi.$$,
  $$[
    {"label":"Nag Hammadi codex editions","note":"Referenced by codex, tractate, and page in critical editions and translations.","relation":"catalogued as"},
    {"label":"Early Christian studies","note":"Cited when reconstructing diverse Christian and Gnostic textual traditions.","relation":"cited in"}
  ]$$::jsonb,
  $$[
    {"label":"Gnostic revelation dialogues","note":"Many tractates frame teaching as secret speech from Jesus or heavenly figures.","relation":"preserves"},
    {"label":"Platonic and biblical language","note":"The codices reuse philosophical and scriptural vocabulary in Coptic translation.","relation":"reworks"}
  ]$$::jsonb
);

select pg_temp.seed_current_atlas_source(
  'oxyrhynchus-papyri',
  'Oxyrhynchus Papyri',
  'text',
  28.535,
  30.652,
  8,
  $$Multiple institutions, chiefly Oxford collections$$,
  'From 1896',
  1896,
  $$Oxyrhynchus, Egypt$$,
  $$Ptolemaic to early Islamic periods$$,
  -300,
  'Egypt',
  $$A vast papyrus archive containing literary works, administrative records, letters, and early Christian texts.$$,
  $$Grenfell and Hunt excavated rubbish mounds at Oxyrhynchus, recovering papyri discarded in the ancient city.$$,
  $$[
    {"label":"Oxyrhynchus Papyri volumes","note":"Published and cited by P.Oxy. inventory and edition numbers.","relation":"catalogued in"},
    {"label":"Classical and documentary papyrology","note":"Used as witnesses for lost literature, administration, everyday letters, and contracts.","relation":"cited in"}
  ]$$::jsonb,
  $$[
    {"label":"Greek literature","note":"Fragments preserve known and otherwise lost works by classical authors.","relation":"transmits"},
    {"label":"Daily administration","note":"Receipts, petitions, leases, and letters document local social and economic life.","relation":"records"}
  ]$$::jsonb
);