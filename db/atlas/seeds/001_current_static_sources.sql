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
  if exists (select 1 from entities where slug = p_slug) then
    return;
  end if;

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

select pg_temp.seed_current_atlas_source(
  'derveni-papyrus',
  'Derveni Papyrus',
  'text',
  40.689,
  22.853,
  7,
  $$Archaeological Museum of Thessaloniki$$,
  '1962',
  1962,
  $$Derveni, near Thessaloniki, Greece$$,
  $$Late 4th century BC$$,
  -350,
  'Aegean',
  $$The oldest surviving European manuscript, preserving a philosophical commentary on an Orphic poem.$$,
  $$The charred roll was found in a cremation grave during road works near Derveni outside Thessaloniki.$$,
  $$[
    {"label":"Derveni Papyrus editions","note":"Referenced by column and line in philological editions of the papyrus.","relation":"catalogued in"},
    {"label":"Greek philosophy and religion","note":"Cited in studies of Presocratic interpretation, allegory, and Orphic poetry.","relation":"cited in"}
  ]$$::jsonb,
  $$[
    {"label":"Orphic poem","note":"The surviving prose comments on verses attributed to Orpheus.","relation":"comments on"},
    {"label":"Ritual and cosmology","note":"The author explains divine names and ritual language as physical allegory.","relation":"interprets"}
  ]$$::jsonb
);

select pg_temp.seed_current_atlas_source(
  'vindolanda-tablets',
  'Vindolanda Tablets',
  'text',
  54.991,
  -2.361,
  7,
  $$British Museum and Vindolanda Museum$$,
  'From 1973',
  1973,
  $$Vindolanda Roman fort, northern England$$,
  $$1st-2nd century AD$$,
  1,
  'Britain',
  $$Thin wooden writing tablets preserving everyday military and personal correspondence from Roman Britain.$$,
  $$Excavators found waterlogged wooden tablets in anaerobic deposits at the Roman fort of Vindolanda.$$,
  $$[
    {"label":"Tabulae Vindolandenses","note":"Published and cited by tablet number in the Vindolanda tablet editions.","relation":"catalogued in"},
    {"label":"Roman Britain histories","note":"Used as evidence for frontier command, supply, literacy, and household life.","relation":"cited in"}
  ]$$::jsonb,
  $$[
    {"label":"Roman frontier administration","note":"Orders, reports, and requests document the work of an auxiliary fort.","relation":"records"},
    {"label":"Personal correspondence","note":"Letters mention invitations, supplies, names, and social ties around the garrison.","relation":"preserves"}
  ]$$::jsonb
);

select pg_temp.seed_current_atlas_source(
  'antikythera-mechanism',
  'Antikythera Mechanism',
  'artifact',
  35.865,
  23.307,
  8,
  $$National Archaeological Museum, Athens$$,
  '1901',
  1901,
  $$Antikythera shipwreck, Greece$$,
  $$2nd-1st century BC$$,
  -200,
  'Aegean',
  $$A geared bronze device used to model astronomical cycles and predict eclipses.$$,
  $$Sponge divers recovered corroded bronze fragments from the Antikythera shipwreck between Kythera and Crete.$$,
  $$[
    {"label":"Shipwreck excavation records","note":"Referenced through the Antikythera wreck assemblage and museum inventory.","relation":"catalogued in"},
    {"label":"History of science studies","note":"Cited as evidence for advanced Hellenistic geared astronomical modeling.","relation":"cited in"}
  ]$$::jsonb,
  $$[
    {"label":"Astronomical cycles","note":"Gear trains model lunar, solar, eclipse, and calendrical cycles.","relation":"computes"},
    {"label":"Greek month and festival calendars","note":"Inscriptions and dials connect calculations to calendrical display.","relation":"indexes"}
  ]$$::jsonb
);

select pg_temp.seed_current_atlas_source(
  'behistun-inscription',
  'Behistun Inscription',
  'inscription',
  34.386,
  47.436,
  9,
  $$In situ at Mount Behistun$$,
  'Copied and studied in the 19th century',
  1835,
  $$Mount Behistun, Iran$$,
  $$c. 520 BC$$,
  -520,
  'Iran',
  $$A royal inscription of Darius I in Old Persian, Elamite, and Babylonian that helped decipher cuneiform.$$,
  $$Henry Rawlinson and other scholars copied the high cliff inscription at Mount Behistun in stages during the 1830s and 1840s.$$,
  $$[
    {"label":"Cuneiform decipherment histories","note":"Referenced as the trilingual anchor for Old Persian and related cuneiform scripts.","relation":"cited in"},
    {"label":"Achaemenid royal inscription corpora","note":"Catalogued as a major Darius I royal inscription.","relation":"catalogued in"}
  ]$$::jsonb,
  $$[
    {"label":"Darius I's accession","note":"The text narrates Darius's claim to kingship and suppression of rivals.","relation":"proclaims"},
    {"label":"Old Persian, Elamite, and Babylonian","note":"The same royal message appears in three cuneiform languages.","relation":"parallels"}
  ]$$::jsonb
);

select pg_temp.seed_current_atlas_source(
  'amarna-letters',
  'Amarna Letters',
  'text',
  27.646,
  30.896,
  8,
  $$Museums in Berlin, London, Cairo, and elsewhere$$,
  '1887',
  1887,
  $$Tell el-Amarna, Egypt$$,
  $$14th century BC$$,
  -1400,
  'Egypt',
  $$Clay tablets preserving diplomatic correspondence between Egypt and Near Eastern rulers.$$,
  $$Local villagers found cuneiform tablets in the ruins of Akhenaten's capital at Tell el-Amarna.$$,
  $$[
    {"label":"El-Amarna tablet editions","note":"Referenced by EA tablet number in editions and diplomatic histories.","relation":"catalogued in"},
    {"label":"Late Bronze Age studies","note":"Cited for international diplomacy, vassal politics, and scribal practice.","relation":"cited in"}
  ]$$::jsonb,
  $$[
    {"label":"Near Eastern rulers","note":"Letters name kings of Babylon, Mitanni, Assyria, Hatti, and city-state rulers.","relation":"corresponds with"},
    {"label":"Tribute, marriage, and military requests","note":"The archive records diplomatic negotiation and local appeals to Pharaoh.","relation":"records"}
  ]$$::jsonb
);

select pg_temp.seed_current_atlas_source(
  'codex-sinaiticus',
  'Codex Sinaiticus',
  'manuscript',
  28.556,
  33.976,
  8,
  $$British Library, Leipzig, St Catherine's Monastery, and National Library of Russia$$,
  '1844-1859',
  1844,
  $$St Catherine's Monastery, Sinai$$,
  $$4th century AD$$,
  300,
  'Sinai',
  $$One of the earliest largely complete manuscripts of the Christian Bible in Greek.$$,
  $$Constantin von Tischendorf encountered leaves at St Catherine's Monastery in Sinai during several nineteenth-century visits.$$,
  $$[
    {"label":"New Testament critical apparatuses","note":"Cited with the siglum Aleph in editions comparing Greek biblical witnesses.","relation":"cited in"},
    {"label":"Codex Sinaiticus project records","note":"Referenced by folio, quire, and holding institution in digital and print catalogues.","relation":"catalogued in"}
  ]$$::jsonb,
  $$[
    {"label":"Greek Christian Bible","note":"Preserves much of the Septuagint and the complete New Testament.","relation":"copies"},
    {"label":"Early Christian book production","note":"Its corrections and format show scribal collaboration in a large codex.","relation":"evidences"}
  ]$$::jsonb
);

select pg_temp.seed_current_atlas_source(
  'stele-hammurabi',
  'Stele of Hammurabi',
  'inscription',
  32.189,
  48.257,
  9,
  $$Louvre Museum$$,
  '1901',
  1901,
  $$Susa, Iran$$,
  $$c. 1754 BC$$,
  -1754,
  'Mesopotamia',
  $$A basalt stele preserving the Babylonian legal collection associated with King Hammurabi.$$,
  $$French excavators found the basalt stele broken into pieces at Susa, where it had been taken as booty in antiquity.$$,
  $$[
    {"label":"Old Babylonian law studies","note":"Referenced by law number and prologue or epilogue section in legal history.","relation":"cited in"},
    {"label":"Louvre Near Eastern collections","note":"Catalogued as a royal monument from Susa preserving Hammurabi's laws.","relation":"catalogued in"}
  ]$$::jsonb,
  $$[
    {"label":"Hammurabi's kingship","note":"The prologue and image present the king as divinely authorized lawgiver.","relation":"proclaims"},
    {"label":"Legal cases and penalties","note":"The clauses describe property, family, injury, labor, and commercial disputes.","relation":"codifies"}
  ]$$::jsonb
);

select pg_temp.seed_current_atlas_source(
  'herculaneum-papyri',
  'Herculaneum Papyri',
  'text',
  40.806,
  14.348,
  7,
  $$Biblioteca Nazionale Vittorio Emanuele III, Naples$$,
  '1752-1754',
  1752,
  $$Villa of the Papyri, Herculaneum$$,
  $$1st century BC-1st century AD$$,
  -100,
  'Italy',
  $$Carbonized scrolls from a Roman villa, many preserving Epicurean philosophical works.$$,
  $$Workers tunneling through the buried Villa of the Papyri at Herculaneum uncovered carbonized scrolls preserved by the eruption of AD 79.$$,
  $$[
    {"label":"Herculaneum papyri catalogues","note":"Referenced by PHerc. numbers and roll history in papyrological catalogues.","relation":"catalogued in"},
    {"label":"Epicurean philosophy studies","note":"Cited as major witnesses for Philodemus and the library of the villa.","relation":"cited in"}
  ]$$::jsonb,
  $$[
    {"label":"Philodemus and Epicurean texts","note":"Many readable rolls preserve philosophical treatises associated with Philodemus.","relation":"transmits"},
    {"label":"Roman elite library culture","note":"The find context links Greek philosophical books to a luxury villa collection.","relation":"evidences"}
  ]$$::jsonb
);
