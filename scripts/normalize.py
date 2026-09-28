import json
import glob
import os

REPL = {
    "ß": "ss",
    "—": " - ",
    "–": " - ",
    "\u00a0": " ",
}


def fix_str(s: str) -> str:
    for a, b in REPL.items():
        s = s.replace(a, b)
    while "  " in s:
        s = s.replace("  ", " ")
    return s


def walk(o):
    if isinstance(o, str):
        return fix_str(o)
    if isinstance(o, list):
        return [walk(x) for x in o]
    if isinstance(o, dict):
        return {k: walk(v) for k, v in o.items()}
    return o


def main():
    roots = ["scripts/parsed", "scripts/modules", "src/data/generated"]
    n = 0
    for root in roots:
        for f in glob.glob(os.path.join(root, "**", "*.json"), recursive=True):
            data = json.load(open(f, encoding="utf-8"))
            json.dump(walk(data), open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
            n += 1
    print(f"normalized {n} files")


if __name__ == "__main__":
    main()
