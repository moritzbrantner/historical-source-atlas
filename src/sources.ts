import type { MapPoint } from "@moritzbrantner/maps";

export type SourceKind =
  | "text"
  | "artifact"
  | "inscription"
  | "manuscript"
  | "collection"
  | "archive";

export type SourceRelationship = {
  label: string;
  note: string;
  relation: string;
};

export type HistoricalSourceProperties = {
  currentRepository: string;
  discovered: string;
  discoveryContext: string;
  discoveredYear: number;
  kind: SourceKind;
  location: string;
  period: string;
  referencedIn: SourceRelationship[];
  references: SourceRelationship[];
  region: string;
  sourceYear: number;
  summary: string;
};

export type HistoricalSource = MapPoint<HistoricalSourceProperties> & {
  id: string;
  label: string;
  metrics: {
    importance: number;
  };
  properties: HistoricalSourceProperties;
};

export const sourceKindLabels: Record<SourceKind, string> = {
  archive: "Archive",
  artifact: "Artifact",
  collection: "Collection",
  inscription: "Inscription",
  manuscript: "Manuscript",
  text: "Text",
};

export const sourceKindColors: Record<SourceKind, string> = {
  archive: "#6d28d9",
  artifact: "#b45309",
  collection: "#be123c",
  inscription: "#475569",
  manuscript: "#0f766e",
  text: "#1d4ed8",
};

export const historicalSources: HistoricalSource[] = [
  sourcePoint({
    id: "dead-sea-scrolls",
    label: "Dead Sea Scrolls",
    latitude: 31.741,
    longitude: 35.458,
    weight: 10,
    properties: {
      currentRepository: "Israel Museum, Shrine of the Book and other collections",
      discovered: "1947-1956",
      discoveryContext:
        "Bedouin shepherds and later archaeological teams recovered the scrolls from caves above Qumran on the northwest Dead Sea shore.",
      discoveredYear: 1947,
      kind: "manuscript",
      location: "Qumran Caves, near the Dead Sea",
      period: "3rd century BC-1st century AD",
      referencedIn: [
        {
          label: "Qumran cave inventories",
          note: "Catalogued by cave and fragment number, then used in editions of the scroll corpus.",
          relation: "catalogued as",
        },
        {
          label: "Biblical manuscript studies",
          note: "Used as early witnesses for Hebrew biblical books and Second Temple textual traditions.",
          relation: "cited in",
        },
      ],
      references: [
        {
          label: "Hebrew Bible traditions",
          note: "Copies, paraphrases, and commentaries preserve variant forms of biblical books.",
          relation: "copies and interprets",
        },
        {
          label: "Qumran community rules",
          note: "Sectarian texts describe communal discipline, ritual order, and eschatological expectation.",
          relation: "records",
        },
      ],
      region: "Levant",
      sourceYear: -300,
      summary:
        "A large group of Jewish religious manuscripts found in caves near Qumran, including biblical and sectarian texts.",
    },
  }),
  sourcePoint({
    id: "rosetta-stone",
    label: "Rosetta Stone",
    latitude: 31.404,
    longitude: 30.417,
    weight: 9,
    properties: {
      currentRepository: "British Museum",
      discovered: "1799",
      discoveryContext:
        "French soldiers found the reused granodiorite slab while strengthening Fort Julien near Rashid during the Egyptian campaign.",
      discoveredYear: 1799,
      kind: "inscription",
      location: "Rashid (Rosetta), Egypt",
      period: "196 BC",
      referencedIn: [
        {
          label: "Decipherment histories",
          note: "Repeatedly cited as the parallel-text key for reading Egyptian hieroglyphs.",
          relation: "cited in",
        },
        {
          label: "British Museum catalogues",
          note: "Listed as a Ptolemaic decree and one of the museum's central epigraphic objects.",
          relation: "catalogued in",
        },
      ],
      references: [
        {
          label: "Ptolemy V Epiphanes",
          note: "The decree praises the king and confirms temple privileges.",
          relation: "commemorates",
        },
        {
          label: "Greek, Demotic, and hieroglyphic scripts",
          note: "The same decree is written in three scripts, enabling cross-reading.",
          relation: "parallels",
        },
      ],
      region: "Egypt",
      sourceYear: -196,
      summary:
        "A trilingual decree whose Greek, Demotic, and hieroglyphic text enabled the decipherment of Egyptian hieroglyphs.",
    },
  }),
  sourcePoint({
    id: "nag-hammadi-codices",
    label: "Nag Hammadi Codices",
    latitude: 26.052,
    longitude: 32.241,
    weight: 8,
    properties: {
      currentRepository: "Coptic Museum, Cairo",
      discovered: "1945",
      discoveryContext:
        "Local farmers uncovered a sealed jar containing papyrus codices near Jabal al-Tarif, north of Nag Hammadi.",
      discoveredYear: 1945,
      kind: "manuscript",
      location: "Near Nag Hammadi, Egypt",
      period: "4th century AD copies",
      referencedIn: [
        {
          label: "Nag Hammadi codex editions",
          note: "Referenced by codex, tractate, and page in critical editions and translations.",
          relation: "catalogued as",
        },
        {
          label: "Early Christian studies",
          note: "Cited when reconstructing diverse Christian and Gnostic textual traditions.",
          relation: "cited in",
        },
      ],
      references: [
        {
          label: "Gnostic revelation dialogues",
          note: "Many tractates frame teaching as secret speech from Jesus or heavenly figures.",
          relation: "preserves",
        },
        {
          label: "Platonic and biblical language",
          note: "The codices reuse philosophical and scriptural vocabulary in Coptic translation.",
          relation: "reworks",
        },
      ],
      region: "Egypt",
      sourceYear: 300,
      summary: "Thirteen Coptic papyrus codices preserving early Christian and Gnostic writings.",
    },
  }),
  sourcePoint({
    id: "oxyrhynchus-papyri",
    label: "Oxyrhynchus Papyri",
    latitude: 28.535,
    longitude: 30.652,
    weight: 8,
    properties: {
      currentRepository: "Multiple institutions, chiefly Oxford collections",
      discovered: "From 1896",
      discoveryContext:
        "Grenfell and Hunt excavated rubbish mounds at Oxyrhynchus, recovering papyri discarded in the ancient city.",
      discoveredYear: 1896,
      kind: "text",
      location: "Oxyrhynchus, Egypt",
      period: "Ptolemaic to early Islamic periods",
      referencedIn: [
        {
          label: "Oxyrhynchus Papyri volumes",
          note: "Published and cited by P.Oxy. inventory and edition numbers.",
          relation: "catalogued in",
        },
        {
          label: "Classical and documentary papyrology",
          note: "Used as witnesses for lost literature, administration, everyday letters, and contracts.",
          relation: "cited in",
        },
      ],
      references: [
        {
          label: "Greek literature",
          note: "Fragments preserve known and otherwise lost works by classical authors.",
          relation: "transmits",
        },
        {
          label: "Daily administration",
          note: "Receipts, petitions, leases, and letters document local social and economic life.",
          relation: "records",
        },
      ],
      region: "Egypt",
      sourceYear: -300,
      summary:
        "A vast papyrus archive containing literary works, administrative records, letters, and early Christian texts.",
    },
  }),
  sourcePoint({
    id: "derveni-papyrus",
    label: "Derveni Papyrus",
    latitude: 40.689,
    longitude: 22.853,
    weight: 7,
    properties: {
      currentRepository: "Archaeological Museum of Thessaloniki",
      discovered: "1962",
      discoveryContext:
        "The charred roll was found in a cremation grave during road works near Derveni outside Thessaloniki.",
      discoveredYear: 1962,
      kind: "text",
      location: "Derveni, near Thessaloniki, Greece",
      period: "Late 4th century BC",
      referencedIn: [
        {
          label: "Derveni Papyrus editions",
          note: "Referenced by column and line in philological editions of the papyrus.",
          relation: "catalogued in",
        },
        {
          label: "Greek philosophy and religion",
          note: "Cited in studies of Presocratic interpretation, allegory, and Orphic poetry.",
          relation: "cited in",
        },
      ],
      references: [
        {
          label: "Orphic poem",
          note: "The surviving prose comments on verses attributed to Orpheus.",
          relation: "comments on",
        },
        {
          label: "Ritual and cosmology",
          note: "The author explains divine names and ritual language as physical allegory.",
          relation: "interprets",
        },
      ],
      region: "Aegean",
      sourceYear: -350,
      summary:
        "The oldest surviving European manuscript, preserving a philosophical commentary on an Orphic poem.",
    },
  }),
  sourcePoint({
    id: "vindolanda-tablets",
    label: "Vindolanda Tablets",
    latitude: 54.991,
    longitude: -2.361,
    weight: 7,
    properties: {
      currentRepository: "British Museum and Vindolanda Museum",
      discovered: "From 1973",
      discoveryContext:
        "Excavators found waterlogged wooden tablets in anaerobic deposits at the Roman fort of Vindolanda.",
      discoveredYear: 1973,
      kind: "text",
      location: "Vindolanda Roman fort, northern England",
      period: "1st-2nd century AD",
      referencedIn: [
        {
          label: "Tabulae Vindolandenses",
          note: "Published and cited by tablet number in the Vindolanda tablet editions.",
          relation: "catalogued in",
        },
        {
          label: "Roman Britain histories",
          note: "Used as evidence for frontier command, supply, literacy, and household life.",
          relation: "cited in",
        },
      ],
      references: [
        {
          label: "Roman frontier administration",
          note: "Orders, reports, and requests document the work of an auxiliary fort.",
          relation: "records",
        },
        {
          label: "Personal correspondence",
          note: "Letters mention invitations, supplies, names, and social ties around the garrison.",
          relation: "preserves",
        },
      ],
      region: "Britain",
      sourceYear: 1,
      summary:
        "Thin wooden writing tablets preserving everyday military and personal correspondence from Roman Britain.",
    },
  }),
  sourcePoint({
    id: "antikythera-mechanism",
    label: "Antikythera Mechanism",
    latitude: 35.865,
    longitude: 23.307,
    weight: 8,
    properties: {
      currentRepository: "National Archaeological Museum, Athens",
      discovered: "1901",
      discoveryContext:
        "Sponge divers recovered corroded bronze fragments from the Antikythera shipwreck between Kythera and Crete.",
      discoveredYear: 1901,
      kind: "artifact",
      location: "Antikythera shipwreck, Greece",
      period: "2nd-1st century BC",
      referencedIn: [
        {
          label: "Shipwreck excavation records",
          note: "Referenced through the Antikythera wreck assemblage and museum inventory.",
          relation: "catalogued in",
        },
        {
          label: "History of science studies",
          note: "Cited as evidence for advanced Hellenistic geared astronomical modeling.",
          relation: "cited in",
        },
      ],
      references: [
        {
          label: "Astronomical cycles",
          note: "Gear trains model lunar, solar, eclipse, and calendrical cycles.",
          relation: "computes",
        },
        {
          label: "Greek month and festival calendars",
          note: "Inscriptions and dials connect calculations to calendrical display.",
          relation: "indexes",
        },
      ],
      region: "Aegean",
      sourceYear: -200,
      summary: "A geared bronze device used to model astronomical cycles and predict eclipses.",
    },
  }),
  sourcePoint({
    id: "behistun-inscription",
    label: "Behistun Inscription",
    latitude: 34.386,
    longitude: 47.436,
    weight: 9,
    properties: {
      currentRepository: "In situ at Mount Behistun",
      discovered: "Copied and studied in the 19th century",
      discoveryContext:
        "Henry Rawlinson and other scholars copied the high cliff inscription at Mount Behistun in stages during the 1830s and 1840s.",
      discoveredYear: 1835,
      kind: "inscription",
      location: "Mount Behistun, Iran",
      period: "c. 520 BC",
      referencedIn: [
        {
          label: "Cuneiform decipherment histories",
          note: "Referenced as the trilingual anchor for Old Persian and related cuneiform scripts.",
          relation: "cited in",
        },
        {
          label: "Achaemenid royal inscription corpora",
          note: "Catalogued as a major Darius I royal inscription.",
          relation: "catalogued in",
        },
      ],
      references: [
        {
          label: "Darius I's accession",
          note: "The text narrates Darius's claim to kingship and suppression of rivals.",
          relation: "proclaims",
        },
        {
          label: "Old Persian, Elamite, and Babylonian",
          note: "The same royal message appears in three cuneiform languages.",
          relation: "parallels",
        },
      ],
      region: "Iran",
      sourceYear: -520,
      summary:
        "A royal inscription of Darius I in Old Persian, Elamite, and Babylonian that helped decipher cuneiform.",
    },
  }),
  sourcePoint({
    id: "amarna-letters",
    label: "Amarna Letters",
    latitude: 27.646,
    longitude: 30.896,
    weight: 8,
    properties: {
      currentRepository: "Museums in Berlin, London, Cairo, and elsewhere",
      discovered: "1887",
      discoveryContext:
        "Local villagers found cuneiform tablets in the ruins of Akhenaten's capital at Tell el-Amarna.",
      discoveredYear: 1887,
      kind: "text",
      location: "Tell el-Amarna, Egypt",
      period: "14th century BC",
      referencedIn: [
        {
          label: "El-Amarna tablet editions",
          note: "Referenced by EA tablet number in editions and diplomatic histories.",
          relation: "catalogued in",
        },
        {
          label: "Late Bronze Age studies",
          note: "Cited for international diplomacy, vassal politics, and scribal practice.",
          relation: "cited in",
        },
      ],
      references: [
        {
          label: "Near Eastern rulers",
          note: "Letters name kings of Babylon, Mitanni, Assyria, Hatti, and city-state rulers.",
          relation: "corresponds with",
        },
        {
          label: "Tribute, marriage, and military requests",
          note: "The archive records diplomatic negotiation and local appeals to Pharaoh.",
          relation: "records",
        },
      ],
      region: "Egypt",
      sourceYear: -1400,
      summary:
        "Clay tablets preserving diplomatic correspondence between Egypt and Near Eastern rulers.",
    },
  }),
  sourcePoint({
    id: "codex-sinaiticus",
    label: "Codex Sinaiticus",
    latitude: 28.556,
    longitude: 33.976,
    weight: 8,
    properties: {
      currentRepository:
        "British Library, Leipzig, St Catherine's Monastery, and National Library of Russia",
      discovered: "1844-1859",
      discoveryContext:
        "Constantin von Tischendorf encountered leaves at St Catherine's Monastery in Sinai during several nineteenth-century visits.",
      discoveredYear: 1844,
      kind: "manuscript",
      location: "St Catherine's Monastery, Sinai",
      period: "4th century AD",
      referencedIn: [
        {
          label: "New Testament critical apparatuses",
          note: "Cited with the siglum Aleph in editions comparing Greek biblical witnesses.",
          relation: "cited in",
        },
        {
          label: "Codex Sinaiticus project records",
          note: "Referenced by folio, quire, and holding institution in digital and print catalogues.",
          relation: "catalogued in",
        },
      ],
      references: [
        {
          label: "Greek Christian Bible",
          note: "Preserves much of the Septuagint and the complete New Testament.",
          relation: "copies",
        },
        {
          label: "Early Christian book production",
          note: "Its corrections and format show scribal collaboration in a large codex.",
          relation: "evidences",
        },
      ],
      region: "Sinai",
      sourceYear: 300,
      summary: "One of the earliest largely complete manuscripts of the Christian Bible in Greek.",
    },
  }),
  sourcePoint({
    id: "stele-hammurabi",
    label: "Stele of Hammurabi",
    latitude: 32.189,
    longitude: 48.257,
    weight: 9,
    properties: {
      currentRepository: "Louvre Museum",
      discovered: "1901",
      discoveryContext:
        "French excavators found the basalt stele broken into pieces at Susa, where it had been taken as booty in antiquity.",
      discoveredYear: 1901,
      kind: "inscription",
      location: "Susa, Iran",
      period: "c. 1754 BC",
      referencedIn: [
        {
          label: "Old Babylonian law studies",
          note: "Referenced by law number and prologue or epilogue section in legal history.",
          relation: "cited in",
        },
        {
          label: "Louvre Near Eastern collections",
          note: "Catalogued as a royal monument from Susa preserving Hammurabi's laws.",
          relation: "catalogued in",
        },
      ],
      references: [
        {
          label: "Hammurabi's kingship",
          note: "The prologue and image present the king as divinely authorized lawgiver.",
          relation: "proclaims",
        },
        {
          label: "Legal cases and penalties",
          note: "The clauses describe property, family, injury, labor, and commercial disputes.",
          relation: "codifies",
        },
      ],
      region: "Mesopotamia",
      sourceYear: -1754,
      summary:
        "A basalt stele preserving the Babylonian legal collection associated with King Hammurabi.",
    },
  }),
  sourcePoint({
    id: "herculaneum-papyri",
    label: "Herculaneum Papyri",
    latitude: 40.806,
    longitude: 14.348,
    weight: 7,
    properties: {
      currentRepository: "Biblioteca Nazionale Vittorio Emanuele III, Naples",
      discovered: "1752-1754",
      discoveryContext:
        "Workers tunneling through the buried Villa of the Papyri at Herculaneum uncovered carbonized scrolls preserved by the eruption of AD 79.",
      discoveredYear: 1752,
      kind: "text",
      location: "Villa of the Papyri, Herculaneum",
      period: "1st century BC-1st century AD",
      referencedIn: [
        {
          label: "Herculaneum papyri catalogues",
          note: "Referenced by PHerc. numbers and roll history in papyrological catalogues.",
          relation: "catalogued in",
        },
        {
          label: "Epicurean philosophy studies",
          note: "Cited as major witnesses for Philodemus and the library of the villa.",
          relation: "cited in",
        },
      ],
      references: [
        {
          label: "Philodemus and Epicurean texts",
          note: "Many readable rolls preserve philosophical treatises associated with Philodemus.",
          relation: "transmits",
        },
        {
          label: "Roman elite library culture",
          note: "The find context links Greek philosophical books to a luxury villa collection.",
          relation: "evidences",
        },
      ],
      region: "Italy",
      sourceYear: -100,
      summary:
        "Carbonized scrolls from a Roman villa, many preserving Epicurean philosophical works.",
    },
  }),
];

function sourcePoint({
  id,
  label,
  latitude,
  longitude,
  properties,
  weight,
}: {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  properties: HistoricalSourceProperties;
  weight: number;
}): HistoricalSource {
  return {
    id,
    label,
    latitude,
    longitude,
    metrics: {
      importance: weight,
    },
    properties,
  };
}
