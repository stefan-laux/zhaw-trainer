import type { SubjectId, SubjectMeta } from "./types";

export const SUBJECTS: SubjectMeta[] = [
  {
    id: "wr",
    name: "Wirtschaftsrecht",
    short: "WR",
    code: "w.BA.XX.3WR-WIN",
    accent: "#C6A15B",
    description: "Vertragsrecht, IP, Compliance, Wettbewerb, Datenschutz, Gesellschaftsrecht, Haftpflicht.",
    examKind: "auto",
    hasExams: true,
    hasModules: true,
    hasTasks: false,
  },
  {
    id: "wins",
    name: "Einführung in das Wirtschaftsinformatik-Studium",
    short: "WINS",
    code: "w.BA.XX.3WINS-WIN",
    accent: "#8FA9C4",
    description: "Socio-Technical Skills: Zeitmanagement, KI-Kompetenz, Self-Leadership, Zusammenarbeit.",
    examKind: "auto",
    hasExams: true,
    hasModules: true,
    hasTasks: false,
  },
  {
    id: "bwl",
    name: "Einführung BWL",
    short: "BWL",
    code: "w.BA.XX.3BWL-WIN",
    accent: "#C98A6B",
    description: "St. Galler Management-Modell, Strategie, Organisation, Prozesse, HRM, CSR.",
    examKind: "mixed",
    hasExams: true,
    hasModules: true,
    hasTasks: false,
  },
  {
    id: "swe1",
    name: "Software Engineering 1",
    short: "SE1",
    code: "w.BA.XX.3SE1",
    accent: "#9C8FB8",
    description: "Java-Grundlagen, OOP, Collections, Exceptions, Streams. Mit offiziellen Prüfungslösungen.",
    examKind: "tasks",
    hasExams: false,
    hasModules: true,
    hasTasks: true,
  },
  {
    id: "wischr",
    name: "Wissenschaftliches Schreiben",
    short: "WiSchr",
    code: "w.BA.XX.3WS-WIN",
    accent: "#A9B48C",
    description: "Wissenschaftliches Arbeiten, Recherche, Zitieren (APA 7), Argumentieren, Präsentieren.",
    examKind: "none",
    hasExams: false,
    hasModules: true,
    hasTasks: false,
  },
];

export const DEFAULT_SUBJECT: SubjectId = "wr";

export function getSubject(id: SubjectId): SubjectMeta {
  return SUBJECTS.find((s) => s.id === id) ?? SUBJECTS[0];
}
