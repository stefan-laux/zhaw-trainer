import json
import os
import re
import sys
import time
import urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "modules")
CTX = os.path.join(BASE, "context", "zusammenfassung.txt")
MODEL = os.environ.get("WR_MODEL", "openai/gpt-4o")

SECTIONS = [
    ("sw1", "SW 1", "Einführung & Vertragsrecht I", 4, 9),
    ("sw2", "SW 2", "Vertragsrecht II - Leistungsstörungen", 10, 19),
    ("sw3", "SW 3", "Vertragsrecht III - IT-Verträge & AGB", 20, 24),
    ("sw4", "SW 4", "Immaterialgüterrecht (IP)", 25, 31),
    ("sw6", "SW 6", "Compliance & Informationssicherheit", 32, 38),
    ("sw7", "SW 7", "Wettbewerbsrecht I - UWG", 39, 41),
    ("sw8", "SW 8", "Wettbewerbsrecht II - Kartellrecht", 42, 46),
    ("sw9", "SW 9", "Datenschutz (revDSG)", 47, 55),
    ("sw11", "SW 11", "Firma, Handelsregister & Vollmacht", 56, 63),
    ("sw12", "SW 12", "Gesellschaftsrecht", 64, 74),
    ("sw13", "SW 13", "Haftpflicht & Unternehmensstrafrecht", 75, 79),
    ("sw14", "SW 14", "Repetition & Prüfungsstrategie", 80, 84),
]

SYSTEM = """Du bist ein Schweizer Wirtschaftsrechts-Dozent an der ZHAW (Modul Wirtschaftsrecht für Wirtschaftsinformatik).
Du erstellst Lernmodule für eine interaktive Lernplattform.

Stütze dich ausschliesslich auf das mitgelieferte Skript der Vorlesung. Ergänze nur, wenn nötig, korrekte Schweizer Gesetzesartikel.
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
   {"title":"string","body":"string","bullets":["..."],"articles":[{"ref":"Art. X OR","text":"kurze Erläuterung"}],"type":"concept|law|example|pitfall|mnemonic|process"}
 ],
 "keyTerms": [{"term":"...","definition":"...","article":"Art. X OR (optional)"}],
 "flashcards": [{"front":"Frage/Begriff","back":"Antwort/Erklärung","tag":"..."}],
 "quiz": [{"question":"...","options":["A","B","C","D"],"correct":[0],"explanation":"...","difficulty":"leicht|mittel|schwer"}]
}
Vorgaben:
- 4 bis 7 blocks mit echtem fachlichem Inhalt.
- 8 bis 14 keyTerms.
- 10 bis 16 flashcards (prüfungsrelevante Definitionen, Abgrenzungen, Artikel).
- 8 bis 12 quiz-Fragen im Multiple-Choice-Stil der Modulendprüfung (eine oder mehrere richtige Antworten, "correct" ist eine Liste von Indizes). Die Quizfragen müssen fachlich korrekt und eindeutig sein.
- articles nur mit korrekter Schweizer Gesetzesnorm."""


def load_key():
    return json.load(open(os.path.expanduser("~/.local/share/opencode/auth.json")))["openrouter"]["key"]


def section_text(pages):
    t = open(CTX, encoding="utf-8").read()
    parts = re.split(r"--- PAGE (\d+) ---", t)
    # parts: [pre, num, body, num, body, ...]
    out = []
    for i in range(1, len(parts), 2):
        num = int(parts[i])
        if pages[0] <= num <= pages[1]:
            out.append(parts[i + 1])
    return "".join(out)


def call(key, messages, max_tokens=8000):
    body = json.dumps({
        "model": MODEL,
        "messages": messages,
        "temperature": 0.25,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }).encode()
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                 "HTTP-Referer": "https://zhaw.ch", "X-Title": "WR Trainer"},
    )
    with urllib.request.urlopen(req, timeout=600) as r:
        return json.loads(r.read().decode())


def main():
    os.makedirs(OUT, exist_ok=True)
    key = load_key()
    wanted = sys.argv[1:] or [s[0] for s in SECTIONS]
    for sid, week, title, p1, p2 in SECTIONS:
        if sid not in wanted:
            continue
        dst = os.path.join(OUT, sid + ".json")
        if os.path.exists(dst):
            print("skip", sid)
            continue
        ctx = section_text((p1, p2))
        user = (f"Erstelle das Lernmodul '{title}' ({week}).\n"
                f"Setze \"title\" auf \"{title}\" und \"week\" auf \"{week}\".\n\n"
                f"=== SKRIPT-AUSZUG (verbindlich) ===\n{ctx}\n\nGib jetzt das JSON zurück.")
        print("generating", sid, title, f"({len(ctx)} chars) ...")
        t0 = time.time()
        resp = call(key, [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}])
        content = resp["choices"][0]["message"]["content"]
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            content = content.strip().strip("`")
            if content.startswith("json"):
                content = content[4:]
            data = json.loads(content)
        data["id"] = sid
        data["week"] = week
        data["title"] = title
        with open(dst, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  done {time.time()-t0:.0f}s tokens={resp.get('usage',{}).get('total_tokens')} "
              f"blocks={len(data.get('blocks',[]))} terms={len(data.get('keyTerms',[]))} "
              f"cards={len(data.get('flashcards',[]))} quiz={len(data.get('quiz',[]))}")


if __name__ == "__main__":
    main()
