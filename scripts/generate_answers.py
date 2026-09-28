import json
import os
import sys
import time
import urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
PARSED = os.path.join(BASE, "parsed")
CTX = os.path.join(BASE, "context", "zusammenfassung.txt")

MODEL = os.environ.get("WR_MODEL", "openai/gpt-4o")

SYSTEM = """Du bist ein erfahrener Schweizer Wirtschaftsrechts-Dozent (ZHAW, Modul Wirtschaftsrecht WIN).
Du erstellst den Lösungsschlüssel für eine echte Multiple-Choice-Modulendprüfung.

Regeln der Prüfung:
- Pro Frage gibt es 5 Aussagen (A-E). Es können EINE, MEHRERE oder ALLE Aussagen richtig sein.
- Es ist mindestens eine Antwort zu wählen.
- Bewertung: 2.5 Punkte wenn exakt alle richtigen (und keine falschen) gewählt; jede falsche Antwort -0.5.

Wichtig zur Interpretation der Frageart:
- Standardfall ("Welche Aussagen sind korrekt?"): Trage alle Aussagen in "correct" ein, die rechtlich zutreffen.
- Ausnahmefall ("Welches ist KEINE ...?", "Was trifft NICHT zu?"): Hier ist genau die Aussage gesucht, welche die Ausnahme bildet. Trage in "correct" die Ausnahme-Aussage(n) ein (also diejenige(n), die als Lösung der Frage gemeint ist/sind). Erläutere knapp, warum.

Du stützt dich auf:
1. Schweizer Bundesrecht (OR, ZGB, DSG, UWG, KG, URG, PatG, MSchG, DesG, SVG, StGB, GwG, AVG) in der aktuellen Fassung.
2. Das beigefügte Skript/Zusammenfassung des Moduls (verbindlich bei Abweichungen zum allgemeinen Wissen).

Antworte AUSSCHLIESSLICH mit gültigem JSON. Kein Markdown, keine Codezäune.
JSON-Schema:
{"questions":[{"number":1,"correct":["A","C"],"explanation":"Kurze, präzise Begründung auf Deutsch (2-4 Sätze), mit Gesetzesartikeln.","confidence":"hoch|mittel|tief"}]}
Die Liste muss ALLE gestellten Fragen in der gegebenen Reihenfolge enthalten."""


def load_key():
    path = os.path.expanduser("~/.local/share/opencode/auth.json")
    return json.load(open(path))["openrouter"]["key"]


def call(key, messages, max_tokens=16000):
    body = json.dumps({
        "model": MODEL,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }).encode()
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://zhaw.ch",
            "X-Title": "WR Trainer",
        },
    )
    with urllib.request.urlopen(req, timeout=600) as r:
        return json.loads(r.read().decode())


def main():
    exams = sys.argv[1:] or ["22HS", "23HS", "24HS", "25HS"]
    key = load_key()
    context = open(CTX, encoding="utf-8").read()[:120000]

    for year in exams:
        src = os.path.join(PARSED, f"{year}.json")
        dst = os.path.join(PARSED, f"{year}.keyed.json")
        if os.path.exists(dst):
            print(f"skip {year} (exists)")
            continue
        questions = json.load(open(src, encoding="utf-8"))
        compact = []
        for q in questions:
            compact.append({
                "number": q["number"],
                "title": q["title"],
                "text": (q["scenario"] + " " + q["prompt"]).strip(),
                "options": {o["label"]: o["text"] for o in q["options"]},
            })
        user = (
            "Hier das Modul-Skript (Auszug):\n\n" + context
            + "\n\n=== PRÜFUNGSFRAGEN (" + year + ") ===\n"
            + json.dumps(compact, ensure_ascii=False)
            + "\n\nGib jetzt den vollständigen Lösungsschlüssel als JSON zurück."
        )
        print(f"generating {year} ...")
        t0 = time.time()
        resp = call(key, [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user},
        ])
        content = resp["choices"][0]["message"]["content"]
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            content = content.strip().strip("`")
            if content.startswith("json"):
                content = content[4:]
            data = json.loads(content)
        by_num = {int(x["number"]): x for x in data["questions"]}
        merged = []
        for q in questions:
            k = by_num.get(q["number"], {})
            correct = k.get("correct", [])
            if isinstance(correct, str):
                correct = [c for c in correct if c.isalpha()]
            merged.append({
                **q,
                "correct": sorted({c.upper() for c in correct}),
                "explanation": k.get("explanation", ""),
                "confidence": k.get("confidence", "mittel"),
                "aiGenerated": True,
            })
        with open(dst, "w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)
        usage = resp.get("usage", {})
        print(f"  done in {time.time()-t0:.0f}s, tokens={usage.get('total_tokens')}, missing={sum(1 for m in merged if not m['correct'])}")


if __name__ == "__main__":
    main()
