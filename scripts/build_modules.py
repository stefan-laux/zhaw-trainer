import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT, SEM, call, load_key, parse_json, norm, write_json, MODEL, extract_pdf

OUTROOT = os.path.join(ROOT, "src", "data", "content")

SYSTEM = """Du bist erfahrener Dozent an der ZHAW (School of Management and Law / Wirtschaftsinformatik).
Du erstellst Lernmodule für eine interaktive Prüfungsvorbereitungs-Plattform.

Stütze dich AUSSCHLIESSLICH auf den mitgelieferten Vorlesungsfolien-Auszug. Ergänze nur offensichtlich notwendige, korrekte Zusatzinformationen.
Sprache: Schweizer Hochdeutsch, KEIN ß (immer ss). Keine Em-Dashes/En-Dashes. Sachlicher, präziser Ton.

Antworte AUSSCHLIESSLICH mit gültigem JSON, kein Markdown, keine Codezäune.
JSON-Schema:
{
 "title": "string",
 "week": "string",
 "tagline": "kurzer prägnanter Satz",
 "summary": "3-5 Sätze Überblick",
 "learningGoals": ["...", "..."],
 "blocks": [
   {"title":"string","body":"string","bullets":["..."],"articles":[{"ref":"Begriff/Norm","text":"kurze Erläuterung"}],"type":"concept|law|example|pitfall|mnemonic|process"}
 ],
 "keyTerms": [{"term":"...","definition":"...","article":"optional"}],
 "flashcards": [{"front":"Frage/Begriff","back":"Antwort/Erklärung","tag":"..."}],
 "quiz": [{"question":"...","options":["A","B","C","D"],"correct":[0],"explanation":"...","difficulty":"leicht|mittel|schwer"}]
}
Vorgaben:
- 4 bis 6 blocks mit echtem fachlichem Inhalt aus den Folien.
- 8 bis 14 keyTerms.
- 10 bis 14 flashcards.
- 6 bis 10 quiz-Fragen (eine oder mehrere richtige Antworten; "correct" ist eine Liste von Indizes).
- "articles" nur wenn sinnvoll (z.B. Modellname/Framework); sonst leer.
- Der Inhalt muss zur Prüfung des Fachs passen."""


MODULES = [
    # subject, id, week, title, [pdf find patterns]
    ("wins", "sw01", "SW 01", "Reiseplanung & Kennenlernen", [["SW 01 Reiseplanung", "SW01 GK.pdf"], ["SW 01 Reiseplanung", "SW01 KK.pdf"], ["GrowthTime Guide", "SW01"]]),
    ("wins", "sw02", "SW 02", "Zeitmanagement & SMARTe Ziele", [["SW 02 Zeitmanagement", "SW 02 GK"], ["SW 02 Zeitmanagement", "SW 02 KK"]]),
    ("wins", "sw03", "SW 03", "KI-Kompetenzen & KI-Nutzung", [["SW 03 KI", "GK KI-Kompetenz.pdf"], ["SW 03 KI", "KK KI-Kompetenz.pdf"]]),

    ("bwl", "sw01", "SW 1", "St. Galler Management-Modell & Interaktionsthemen", [["Folien BWL SW1.pdf"]]),
    ("bwl", "sw02", "SW 2-3", "Strategische Unternehmensführung", [["Folien BWL SW 2"]]),
    ("bwl", "sw04", "SW 4-5", "Ordnungsmomente & Entwicklungsmodi", [["Folien BWL SW4_5"]]),

    ("wischr", "sw01", "SW 01", "Einführung in wissenschaftliches Arbeiten", [["Vorlesungsunterlagen SW 01", "SW 01.pdf"], ["Unterlagen Kleinklasse SW 01", "SW01_Folien KK.pdf"]]),
    ("wischr", "sw02", "SW 02", "Was ist Wissenschaft?", [["Vorlesungsunterlagen SW 02", "SW 02.pdf"], ["Unterlagen Kleinklasse SW 02", "SW 2 Handout KK.pdf"]]),
    ("wischr", "sw03", "SW 03", "Wissenschaftliches Schreiben", [["Unterlagen Grossklasse", "SW3 GK Handout"]]),
    ("wischr", "sw04", "SW 04", "Recherche", [["Vorlesungsunterlagen SW 04", "SW 04.pdf"]]),
    ("wischr", "sw05", "SW 05", "Lesetechnik, Exzerpieren & Disposition", [["Vorlesungsunterlagen SW 05", "SW 05.pdf"]]),
    ("wischr", "sw06", "SW 06", "Zitieren nach APA 7", [["Vorlesungsunterlagen SW 06", "SW 06b"] , ["Vorlesungsunterlagen SW 06", "SW 06a.pdf"]]),
    ("wischr", "sw07", "SW 07-08", "Auftrittskompetenz & Storytelling", [["Grossklasse", "SW07_Handout_Stud.pdf"], ["Grossklasse", "SW08_GK_Handout_Stud.pdf"]]),
    ("wischr", "sw09", "SW 09", "Formale Anforderungen an Arbeiten", [["Vorlesungsunterlagen SW 09", "SW 09.pdf"]]),
    ("wischr", "sw11", "SW 11", "Kritisches Denken I", [["Vorlesungsunterlagen SW 11", "SW 11.pdf"]]),

    ("swe1", "java1", "Woche 1", "Java Grundlagen", [["14. September", "Vorlesung 1 Slides.pdf"], ["Literatur", "Einstieg in Java und OOP.pdf"]]),
    ("swe1", "java2", "Woche 2", "Kontrollfluss, Bedingungen & Schleifen", [["21. September", "Vorlesung 2 Slides.pdf"], ["Literatur", "UML Activity-Diagramm.pdf"]]),
    ("swe1", "java3", "Woche 3", "Arrays & for-Schleifen", [["28. September", "Vorlesung 3 Slides.pdf"], ["28. September", "Übung 3 Aufgabenstellung.pdf"]]),
]

SUBJECT_ROOT = {
    "wins": os.path.join(SEM, "Einführung in das Wirtschaftsinformatik-Studium", "Moodle Export"),
    "bwl": os.path.join(SEM, "Einführung BWL", "Moodle Export"),
    "wischr": os.path.join(SEM, "Wissenschaftliches Schreiben", "Moodle Export"),
    "swe1": os.path.join(SEM, "Software Engineering 1", "Moodle Export"),
}


def collect(subject, patterns):
    base = SUBJECT_ROOT[subject]
    groups = [p if isinstance(p, list) else [p] for p in patterns]
    files = []
    for dirpath, _, fnames in os.walk(base):
        for fn in fnames:
            if fn == ".DS_Store":
                continue
            low = os.path.join(dirpath, fn).lower()
            if any(all(p.lower() in low for p in group) for group in groups):
                files.append(os.path.join(dirpath, fn))
    return files


def main():
    key = load_key()
    only = sys.argv[1:]
    for subject, sid, week, title, patterns in MODULES:
        if only and subject not in only and sid not in only:
            continue
        dst = os.path.join(OUTROOT, subject, "modules", f"{sid}.json")
        if os.path.exists(dst):
            print("skip", subject, sid)
            continue
        files = collect(subject, patterns)
        if not files:
            print("NO FILES", subject, sid, patterns)
            continue
        ctx = ""
        for f in files:
            try:
                ctx += f"\n\n===== {os.path.basename(f)} =====\n" + extract_pdf(f)
            except Exception as e:
                print("  pdf err", f, e)
        ctx = ctx[:160000]
        if len(ctx) < 300:
            print("too little text", subject, sid)
            continue
        print(f"generating {subject}/{sid} '{title}' ({len(ctx)} chars)...")
        t0 = time.time()
        resp = call(key, [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"Erstelle das Lernmodul '{title}' ({week}) für das Fach {subject}. "
                                        f"Setze \"title\" auf \"{title}\" und \"week\" auf \"{week}\".\n\n"
                                        f"=== VORLESUNGSFOLIEN (Auszug, verbindlich) ===\n{ctx}\n\nGib jetzt das JSON zurück."},
        ], max_tokens=9000)
        data = parse_json(resp["choices"][0]["message"]["content"])
        data["id"] = f"{subject}-{sid}"
        data["subjectId"] = subject
        data["week"] = week
        data["title"] = title
        write_json(dst, data)
        print(f"  done {time.time()-t0:.0f}s blocks={len(data.get('blocks',[]))} cards={len(data.get('flashcards',[]))} quiz={len(data.get('quiz',[]))}")


if __name__ == "__main__":
    main()
