import json
import os
import re
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEM = os.path.dirname(ROOT)  # Semester 1
SCRIPTS = os.path.join(ROOT, "scripts")
CONTEXT = os.path.join(SCRIPTS, "context")
OUTDIR = os.path.join(SCRIPTS, "build")

MODEL = os.environ.get("WR_MODEL", "openai/gpt-4o")


def load_key():
    return json.load(open(os.path.expanduser("~/.local/share/opencode/auth.json")))["openrouter"]["key"]


def call(key, messages, max_tokens=16000, temperature=0.2):
    body = json.dumps({
        "model": MODEL,
        "messages": messages,
        "temperature": temperature,
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
            "X-Title": "ZHAW Trainer",
        },
    )
    with urllib.request.urlopen(req, timeout=900) as r:
        return json.loads(r.read().decode())


def parse_json(content):
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        content = content.strip().strip("`")
        if content.startswith("json"):
            content = content[4:]
        return json.loads(content.strip())


def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return path


def extract_pdf(path):
    import pymupdf
    doc = pymupdf.open(path)
    parts = []
    for i, page in enumerate(doc):
        parts.append(f"\n--- PAGE {i + 1} ---\n" + page.get_text())
    return "".join(parts)


def find(base, *needles):
    """Return files under base whose lowercase path contains all needles."""
    hits = []
    for dirpath, _, files in os.walk(base):
        for fn in files:
            if fn == ".DS_Store":
                continue
            low = os.path.join(dirpath, fn).lower()
            if all(n.lower() in low for n in needles):
                hits.append(os.path.join(dirpath, fn))
    return sorted(hits)


def norm(text):
    for a, b in {"ß": "ss", "—": " - ", "–": " - ", "\u00a0": " "}.items():
        text = text.replace(a, b)
    while "  " in text:
        text = text.replace("  ", " ")
    return text
