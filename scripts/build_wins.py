import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT, SEM, OUTDIR, call, load_key, parse_json, norm, write_json, MODEL

WINS_DIR = os.path.join(SEM, "Einführung in das Wirtschaftsinformatik-Studium", "Modulendprüfungen", "Markdown")
OUT = os.path.join(ROOT, "src", "data", "content", "wins", "exams")
OPTION_RE = re.compile(r"^-\s+\*\*([A-Ea-e])\)\*\*\s*(.*)$")
Q_RE = re.compile(r"^##\s+Frage\s+(\d+)\s*$")


def parse(path):
    lines = open(path, encoding="utf-8").read().split("\n")
    qs = []
    cur = None
    in_catalog = False
    for raw in lines:
        line = raw.rstrip()
        if line.startswith("## Fragekatalog") or line.startswith("## Fragenteil"):
            in_catalog = True
            continue
        qm = Q_RE.match(line)
        if qm and in_catalog:
            if cur and cur["options"]:
                qs.append(cur)
            cur = {"number": int(qm.group(1)), "prompt": "", "options": []}
            continue
        if not in_catalog or cur is None:
            continue
        om = OPTION_RE.match(line)
        if om:
            cur["options"].append({"label": om.group(1).upper(), "text": om.group(2).strip()})
            continue
        if line.strip().startswith("Frage:"):
            cur["prompt"] = (cur["prompt"] + " " + line.split("Frage:", 1)[1].strip()).strip()
        elif line.strip() and not cur["options"]:
            cur["prompt"] = (cur["prompt"] + " " + line.strip()).strip()
    if cur and cur["options"]:
        qs.append(cur)
    for q in qs:
        q["prompt"] = re.sub(r"\s+", " ", q["prompt"]).strip()
        for o in q["options"]:
            o["text"] = re.sub(r"\s+", " ", o["text"]).strip()
        q["options"] = q["options"][:5]
    return qs


SYSTEM = """Du bist Prüfungsexperte für das ZHAW-Modul "Einführung in das Wirtschaftsinformatik-Studium" (Socio-Technical Skills).
Single-Choice: Es ist GENAU EINE Antwort pro Frage richtig.
Bestimme für jede Frage die richtige Option und schreibe eine kurze Begründung (1-2 Sätze, Deutsch).
Antworte nur mit JSON: {"answers":[{"number":1,"correct":"C","explanation":"..."}]}
Die Liste muss ALLE Fragen enthalten."""


def points_for(n, uniform=None):
    if uniform is not None:
        return uniform
    if n <= 13:
        return 1
    if n <= 31:
        return 1.5
    return 2


def uniform_points(text):
    for line in text.split("\n"):
        if "oder" in line:
            continue
        m = re.search(r"([0-9]+(?:[.,][0-9]+)?)\s*Punkte\s*je\s*Frage", line)
        if m:
            return float(m.group(1).replace(",", "."))
    return None


def main():
    key = load_key()
    for f in sorted(os.listdir(WINS_DIR)):
        if not f.endswith(".md"):
            continue
        year = f.replace("BA.3WINS-WIN_", "").replace(".md", "")
        dst = os.path.join(OUT, f"{year}.json")
        if os.path.exists(dst):
            print("skip", year)
            continue
        qs = parse(os.path.join(WINS_DIR, f))
        text = open(os.path.join(WINS_DIR, f), encoding="utf-8").read()
        uniform = uniform_points(text)
        compact = [{"number": q["number"], "question": q["prompt"], "options": {o["label"]: o["text"] for o in q["options"]}} for q in qs]
        print(f"generating answers WINS {year} ({len(qs)} questions)...")
        t0 = time.time()
        resp = call(key, [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": json.dumps(compact, ensure_ascii=False)},
        ])
        data = parse_json(resp["choices"][0]["message"]["content"])
        byn = {int(a["number"]): a for a in data.get("answers", [])}
        out = []
        for q in qs:
            a = byn.get(q["number"], {})
            correct = a.get("correct", "")
            if isinstance(correct, list):
                correct = correct[0] if correct else ""
            correct = (correct or "").strip().upper()[:1]
            out.append({
                "number": q["number"],
                "type": "single",
                "prompt": norm(q["prompt"]),
                "options": [{"label": o["label"], "text": norm(o["text"])} for o in q["options"]],
                "correct": [correct] if correct else [],
                "points": points_for(q["number"], uniform),
                "explanation": norm(a.get("explanation", "")),
                "source": f"Altprüfung {year}",
                "aiGenerated": True,
            })
        exam = {
            "id": f"wins-{year}",
            "subjectId": "wins",
            "year": year.replace("HS", "HS"),
            "label": f"MEP {year}",
            "minutes": 60,
            "maxPoints": round(sum(q["points"] for q in out), 2),
            "scoring": "exact",
            "questions": out,
        }
        write_json(dst, exam)
        missing = [q["number"] for q in out if not q["correct"]]
        print(f"  done {time.time()-t0:.0f}s, missing={missing}")


if __name__ == "__main__":
    main()
