import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT, SEM, call, load_key, parse_json, norm, write_json, MODEL

BWL_DIR = os.path.join(SEM, "Einführung BWL", "Modulendprüfungen", "Markdown")
OUT = os.path.join(ROOT, "src", "data", "content", "bwl", "exams")

SYSTEM = """Du bist Prüfungsexperte für das ZHAW-Modul "Einführung BWL".
Du zerlegst eine echte Altprüfung in ein einheitliches JSON-Fragenformat.

Fragetypen:
- "truefalse": Aussagen mit Richtig/Falsch. Nutze options [{"label":"R","text":"Richtig"},{"label":"F","text":"Falsch"}] und correct ["R"] oder ["F"].
- "single": genau eine richtige Option (A-E).
- "open": offene Frage/Fallaufgabe ohne vorgegebene Optionen. Gib eine ausführliche Musterlösung als "modelAnswer" und die Punktzahl an.

Regeln:
- Erhalte die Aufgabenstruktur und Punktzahlen so genau wie möglich. Die Summe aller points muss exakt der Gesamtpunktzahl (40) entsprechen.
- Bei R/F-Blöcken: jede Aussage als eigene "truefalse"-Frage; points = Blockpunkte / Anzahl Aussagen.
- Bei offenen Fallaufgaben: eine "open"-Frage mit modelAnswer (fachlich korrekt, Deutsch, Schweizer Orthografie: immer ss statt ß).
- "prompt" enthält die eigentliche Frage. "scenario" enthält einen allfälligen Falltext (oder leer).
- Ergänze bei single/truefalse eine kurze "explanation".

Antworte NUR mit JSON:
{"questions":[{"type":"truefalse|single|open","prompt":"...","scenario":"...","options":[...],"correct":["R"],"points":0.5,"explanation":"...","modelAnswer":"..."}]}
Die Reihenfolge folgt der Prüfung. Keine Markdown-Codezäune."""


def main():
    key = load_key()
    for f in sorted(os.listdir(BWL_DIR)):
        if not f.endswith(".md"):
            continue
        year = f.replace("BA.3BWL-WIN_", "").replace(".md", "")
        dst = os.path.join(OUT, f"{year}.json")
        if os.path.exists(dst):
            print("skip", year)
            continue
        text = open(os.path.join(BWL_DIR, f), encoding="utf-8").read()
        print(f"structuring BWL {year} ({len(text)} chars)...")
        t0 = time.time()
        resp = call(key, [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"=== ALT PRÜFUNG {year} ===\n{text}\n\nGib jetzt das JSON zurück."},
        ], max_tokens=20000)
        data = parse_json(resp["choices"][0]["message"]["content"])
        qs = data.get("questions", [])
        total = round(sum(float(q.get("points", 0)) for q in qs), 2)
        out = []
        for i, q in enumerate(qs):
            out.append({
                "number": i + 1,
                "type": q.get("type", "open"),
                "prompt": norm(q.get("prompt", "")),
                "scenario": norm(q.get("scenario", "")),
                "options": [{"label": o.get("label", ""), "text": norm(o.get("text", ""))} for o in (q.get("options") or [])],
                "correct": q.get("correct") or [],
                "points": float(q.get("points", 0)),
                "explanation": norm(q.get("explanation", "")),
                "modelAnswer": norm(q.get("modelAnswer", "")),
                "source": f"Altprüfung {year}",
                "aiGenerated": True,
            })
        exam = {
            "id": f"bwl-{year}",
            "subjectId": "bwl",
            "year": year,
            "label": f"MEP {year}",
            "minutes": 60,
            "maxPoints": total,
            "scoring": "mixed",
            "questions": out,
        }
        write_json(dst, exam)
        types = {}
        for q in out:
            types[q["type"]] = types.get(q["type"], 0) + 1
        print(f"  done {time.time()-t0:.0f}s, total={total}, types={types}")


if __name__ == "__main__":
    main()
