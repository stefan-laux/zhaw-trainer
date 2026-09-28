import json
import glob
import os

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)


def main():
    ex_dst = os.path.join(ROOT, "src", "data", "content", "wr", "exams")
    md_dst = os.path.join(ROOT, "src", "data", "content", "wr", "modules")
    os.makedirs(ex_dst, exist_ok=True)
    os.makedirs(md_dst, exist_ok=True)

    for f in glob.glob(os.path.join(BASE, "parsed", "*.keyed.json")):
        year = os.path.basename(f).replace(".keyed.json", "")
        arr = json.load(open(f, encoding="utf-8"))
        qs = []
        for q in arr:
            qs.append({
                "number": q["number"],
                "type": "multi",
                "title": q.get("title", ""),
                "scenario": q.get("scenario", ""),
                "prompt": q["prompt"],
                "options": q["options"],
                "correct": q["correct"],
                "points": 2.5,
                "explanation": q.get("explanation", ""),
                "confidence": q.get("confidence", "mittel"),
                "source": f"Altprüfung {year}",
                "aiGenerated": True,
            })
        exam = {
            "id": f"wr-{year}",
            "subjectId": "wr",
            "year": year,
            "label": f"MEP {year}",
            "minutes": 90,
            "maxPoints": 90,
            "scoring": "penalty",
            "questions": qs,
        }
        json.dump(exam, open(os.path.join(ex_dst, f"{year}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    for f in glob.glob(os.path.join(BASE, "modules", "*.json")):
        sid = os.path.basename(f).replace(".json", "")
        m = json.load(open(f, encoding="utf-8"))
        m["subjectId"] = "wr"
        m["id"] = f"wr-{sid}"
        json.dump(m, open(os.path.join(md_dst, f"{sid}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print("migrated WR:", len(glob.glob(os.path.join(ex_dst, "*.json"))), "exams,",
          len(glob.glob(os.path.join(md_dst, "*.json"))), "modules")


if __name__ == "__main__":
    main()
