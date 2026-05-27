import type { MapPoint } from "@moritzbrantner/maps";

export type SourceKind = "text" | "artifact" | "inscription" | "manuscript";

export type HistoricalSourceProperties = {
  currentRepository: string;
  discovered: string;
  kind: SourceKind;
  location: string;
  period: string;
  region: string;
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
  artifact: "Artifact",
  inscription: "Inscription",
  manuscript: "Manuscript",
  text: "Text",
};

export const sourceKindColors: Record<SourceKind, string> = {
  artifact: "#b45309",
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
      kind: "manuscript",
      location: "Qumran Caves, near the Dead Sea",
      period: "3rd century BCE-1st century CE",
      region: "Levant",
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
      kind: "inscription",
      location: "Rashid (Rosetta), Egypt",
      period: "196 BCE",
      region: "Egypt",
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
      kind: "manuscript",
      location: "Near Nag Hammadi, Egypt",
      period: "4th century CE copies",
      region: "Egypt",
      summary:
        "Thirteen Coptic papyrus codices preserving early Christian and Gnostic writings.",
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
      kind: "text",
      location: "Oxyrhynchus, Egypt",
      period: "Ptolemaic to early Islamic periods",
      region: "Egypt",
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
      kind: "text",
      location: "Derveni, near Thessaloniki, Greece",
      period: "Late 4th century BCE",
      region: "Aegean",
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
      kind: "text",
      location: "Vindolanda Roman fort, northern England",
      period: "1st-2nd century CE",
      region: "Britain",
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
      kind: "artifact",
      location: "Antikythera shipwreck, Greece",
      period: "2nd-1st century BCE",
      region: "Aegean",
      summary:
        "A geared bronze device used to model astronomical cycles and predict eclipses.",
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
      kind: "inscription",
      location: "Mount Behistun, Iran",
      period: "c. 520 BCE",
      region: "Iran",
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
      kind: "text",
      location: "Tell el-Amarna, Egypt",
      period: "14th century BCE",
      region: "Egypt",
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
      kind: "manuscript",
      location: "St Catherine's Monastery, Sinai",
      period: "4th century CE",
      region: "Sinai",
      summary:
        "One of the earliest largely complete manuscripts of the Christian Bible in Greek.",
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
      kind: "inscription",
      location: "Susa, Iran",
      period: "c. 1754 BCE",
      region: "Mesopotamia",
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
      kind: "text",
      location: "Villa of the Papyri, Herculaneum",
      period: "1st century BCE-1st century CE",
      region: "Italy",
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
