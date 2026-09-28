# ZHAW Trainer

Interaktive Lernplattform für die Module im 1. Semester WIN. Enthält echte Altprüfungen, Lernmodule, Karteikarten, einen Prüfungs- und Aufgabensmodus sowie einen KI-Tutor.

## Fächer

| Fach | Prüfungen | Lernmodule | Aufgaben |
| --- | --- | --- | --- |
| Wirtschaftsrecht | 4 (Multiple Choice) | 13 | - |
| Einführung WINS | 4 (Single Choice) | 3 | - |
| Einführung BWL | 4 (Richtig/Falsch + offen) | 3 | - |
| Software Engineering 1 | - | 2 | 4 (mit offiziellen Lösungen) |
| Wissenschaftliches Schreiben | - | 9 | - |

## Lokal starten

```bash
npm install
cp .env.example .env.local   # Firebase-Keys eintragen (optional)
npm run dev
```

## KI-Tutor

Jede/r Nutzer/in trägt den eigenen **OpenRouter-API-Key** in den **Einstellungen** ein (Feld "KI-Schlüssel"). Der Key wird nur lokal im Browser (localStorage) gespeichert und nie an unsere Server gesendet. Die KI-Aufrufe gehen direkt vom Browser zu OpenRouter. Key erstellen: https://openrouter.ai/keys

## Firebase einrichten (optional, für Login und Sync)

1. Projekt auf https://console.firebase.google.com erstellen.
2. **Authentication** aktivieren: Anbieter *Google* und *E-Mail/Passwort*.
3. **Firestore Database** erstellen (Produktionsmodus).
4. Web-App registrieren und die Config-Werte in `.env.local` (lokal) bzw. Vercel-Env eintragen.
5. `VITE_ADMIN_EMAILS` mit deiner E-Mail füllen.

Kein **Cloud Storage** nötig: Hochgeladene Folien werden in Firestore gespeichert (in ~700 KB-Chunks als Base64) und beim Öffnen wieder zusammengesetzt. Damit läuft alles auf dem kostenlosen Spark-Plan. Ohne Firebase läuft die App vollständig lokal.

### Firestore-Regeln (Start, anpassen)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }
    match /slides/{id} { allow read: if true; allow write: if request.auth != null; }
    match /content/{subject}/{kind}/{id} { allow read: if true; allow write: if request.auth != null; }
  }
}
```

Hinweis: Dateien werden in der `slides`-Collection als Chunk-Dokumente (`<id>__c0`, `<id>__c1`, ...) abgelegt, damit keine eigene Regel nötig ist. Firestore-Dokumente sind auf 1 MiB begrenzt, deshalb die Chunks.

## Deploy auf Vercel

```bash
npm i -g vercel
vercel                     # Projekt verknüpfen
vercel env add VITE_FIREBASE_API_KEY
# ... alle weiteren VITE_FIREBASE_* und VITE_ADMIN_EMAILS
vercel --prod
```

Vercel erkennt Vite automatisch (Build `npm run build`, Output `dist`). `vercel.json` regelt das SPA-Routing.

## Folien nachträglich ergänzen

Im Admin-Bereich (`/admin`) können für fehlende Wochen Folien/Unterlagen als PDF/PPTX hochgeladen werden. Sie erscheinen im jeweiligen Modul unter dem Reiter "Folien". So lassen sich Wochen, deren Material noch nicht online ist, später befüllen.

## Datenmodell

```
scripts/build_*.py      -> erzeugt JSON-Inhalte
src/data/content/<fach>/{exams,modules,tasks}/*.json
src/data/registry.ts    -> Fächer-Metadaten (Farbe, Prüfungstyp)
```

Lösungsschlüssel der Altprüfungen sind KI-gestützt erstellt und mit den Unterlagen abgeglichen, aber keine offiziellen Musterlösungen. Im Resultat können sie manuell korrigiert werden.
