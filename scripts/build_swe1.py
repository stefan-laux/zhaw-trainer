import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT, SEM, call, load_key, parse_json, norm, write_json, MODEL, extract_pdf

MEP = os.path.join(SEM, "Software Engineering 1", "Modulendprüfungen")
OUT = os.path.join(ROOT, "src", "data", "content", "swe1", "tasks")

SYSTEM = """Du bist Dozent für Software Engineering 1 (Java) an der ZHAW.
Du wandelst eine echte Modulendprüfung (Frageteil + offizieller Antwortteil) in ein strukturiertes JSON um.

Für jede Teilaufgabe:
- "title": kurzer Titel (z.B. "Java Grundkenntnisse", "String-Operationen")
- "points": maximale Punktzahl (Zahl)
- "task": die vollständige Aufgabenstellung (Text, ggf. mit Codezeilen, verständlich formatiert)
- "solution": die vollständige offizielle Musterlösung (Code und Erklärungen) aus dem Antwortteil
- "hints": optional ein kurzer Lösungshinweis

Antworte NUR mit JSON: {"tasks":[{"number":1,"title":"...","points":20,"task":"...","solution":"...","hints":"..."}]}
Behalte die Nummerierung und Punktzahlen bei. Schweizer Orthografie (ss statt ß). Keine Codezäune."""


def pairs():
    result = []
    for fn in sorted(os.listdir(MEP)):
        m = re.search(r"(HS\d{2,4}|FS\d{2}).*Fragen\.pdf$", fn)
        if not m:
            continue
        tag = m.group(1)
        answers = [x for x in os.listdir(MEP) if tag in x and "Antworten" in x]
        if answers:
            result.append((tag, os.path.join(MEP, fn), os.path.join(MEP, answers[0])))
    return result


def main():
    key = load_key()
    os.makedirs(OUT, exist_ok=True)
    for tag, fpath, apath in pairs():
        dst = os.path.join(OUT, f"{tag}.json")
        if os.path.exists(dst):
            print("skip", tag)
            continue
        ftxt = extract_pdf(fpath)
        atxt = extract_pdf(apath)
        print(f"structuring SE1 {tag} (fragen {len(ftxt)}, antworten {len(atxt)})...")
        t0 = time.time()
        resp = call(key, [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"=== FRAGETEIL ===\n{ftxt}\n\n=== OFFIZIELLER ANTWORTTEIL ===\n{atxt}\n\nGib jetzt das JSON zurück."},
        ], max_tokens=20000)
        data = parse_json(resp["choices"][0]["message"]["content"])
        tasks = data.get("tasks", [])
        total = round(sum(float(t.get("points", 0)) for t in tasks), 2)
        out = {
            "id": f"swe1-{tag}",
            "subjectId": "swe1",
            "year": tag,
            "label": f"MEP {tag}",
            "minutes": 90,
            "maxPoints": total,
            "tasks": [{
                "number": t.get("number", i + 1),
                "title": norm(t.get("title", "")),
                "points": float(t.get("points", 0)),
                "task": norm(t.get("task", "")),
                "solution": norm(t.get("solution", "")),
                "hints": norm(t.get("hints", "")),
            } for i, t in enumerate(tasks)],
        }
        write_json(dst, out)
        print(f"  done {time.time()-t0:.0f}s tasks={len(tasks)} total={total}")


if __name__ == "__main__":
    main()
