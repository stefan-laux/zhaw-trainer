import json, glob, os, shutil

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
DST = os.path.join(ROOT, "src", "data", "generated")

def main():
    os.makedirs(os.path.join(DST, "exams"), exist_ok=True)
    os.makedirs(os.path.join(DST, "modules"), exist_ok=True)
    n = 0
    for f in sorted(glob.glob(os.path.join(BASE, "parsed", "*.keyed.json"))):
        shutil.copy(f, os.path.join(DST, "exams", os.path.basename(f)))
        n += 1
    m = 0
    for f in sorted(glob.glob(os.path.join(BASE, "modules", "*.json"))):
        shutil.copy(f, os.path.join(DST, "modules", os.path.basename(f)))
        m += 1
    print(f"copied {n} exams, {m} modules -> {DST}")

if __name__ == "__main__":
    main()
