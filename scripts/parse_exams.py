import json
import re
import sys
import os

BASE = "/Users/stefanlaux/Library/CloudStorage/GoogleDrive-stefanlaux22@gmail.com/My Drive/ZHAW/Semester 1/Wirtschaftsrecht/Modulendprüfungen/Markdown"
OUT = "/Users/stefanlaux/Library/CloudStorage/GoogleDrive-stefanlaux22@gmail.com/My Drive/ZHAW/Semester 1/Wirtschaftsrecht/WR-Trainer/scripts/parsed"

OPTION_RE = re.compile(r"^-\s+\*\*([A-Ea-e])\)\*\*\s*(.*)$")
QUESTION_RE = re.compile(r"^##\s+Frage\s+(\d+)(.*)$")


def parse_file(path):
    with open(path, "r", encoding="utf-8") as f:
        lines = f.read().split("\n")

    questions = []
    current = None
    current_opt = None
    in_questions = False

    for raw in lines:
        line = raw.rstrip()

        qm = QUESTION_RE.match(line)
        if qm:
            in_questions = True
            if current and current["options"]:
                questions.append(current)
            current = {
                "number": int(qm.group(1)),
                "title": qm.group(2).strip(),
                "scenario": "",
                "prompt": "",
                "options": [],
            }
            current_opt = None
            continue

        if not in_questions or current is None:
            continue

        om = OPTION_RE.match(line)
        if om:
            label = om.group(1).upper()
            text = om.group(2).strip()
            current["options"].append({"label": label, "text": text})
            current_opt = current["options"][-1]
            continue

        if current_opt is not None and line.strip():
            if line.startswith("  ") or line.startswith("\t") or line.startswith("   "):
                current_opt["text"] += "\n" + line.strip()
            else:
                current_opt["text"] += "\n" + line.strip()
            continue

        if line.strip():
            if not current["options"]:
                if "?" in line and ("Welche" in line or "Was " in line or "Welches" in line or "Wird" in line or "Ist" in line):
                    current["prompt"] = (current["prompt"] + " " + line.strip()).strip()
                else:
                    current["scenario"] = (current["scenario"] + " " + line.strip()).strip()

    if current and current["options"]:
        questions.append(current)

    for q in questions:
        for o in q["options"]:
            o["text"] = re.sub(r"\s+", " ", o["text"]).strip()
        q["scenario"] = re.sub(r"\s+", " ", q["scenario"]).strip()
        q["prompt"] = re.sub(r"\s+", " ", q["prompt"]).strip()
        q["options"] = q["options"][:5]
    return questions


def main():
    os.makedirs(OUT, exist_ok=True)
    files = {
        "22HS": "BA.3WR-WIN_22HS.md",
        "23HS": "BA.3WR-WIN_23HS.md",
        "24HS": "BA.3WR-WIN_24HS.md",
        "25HS": "BA.3WR-WIN_25HS.md",
    }
    summary = {}
    for year, fname in files.items():
        path = os.path.join(BASE, fname)
        qs = parse_file(path)
        with open(os.path.join(OUT, f"{year}.json"), "w", encoding="utf-8") as f:
            json.dump(qs, f, ensure_ascii=False, indent=2)
        summary[year] = len(qs)
    print(json.dumps(summary, indent=2))
    for year in files:
        p = os.path.join(OUT, f"{year}.json")
        qs = json.load(open(p, encoding="utf-8"))
        for q in qs:
            if len(q["options"]) != 5:
                print(f"WARN {year} Q{q['number']}: {len(q['options'])} options")


if __name__ == "__main__":
    main()
