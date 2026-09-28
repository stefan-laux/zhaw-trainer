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
cp .env.example .env.local   # Keys eintragen (mind. OPENROUTER_API_KEY)
npm run dev
```

## KI-Tutor

Der OpenRouter-Key wird nie im Browser gespeichert:
- Entwicklung: Vite-Proxy (`vite.config.ts`) liest `OPENROUTER_API_KEY` aus `.env.local`.
- Produktion: Serverless-Funktion `api/ai/chat.ts`.

## Firebase einrichten (optional, für Login, Sync und Folien-Upload)

1. Projekt auf https://console.firebase.google.com erstellen.
2. **Authentication** aktivieren: Anbieter *Google* und *E-Mail/Passwort*.
3. **Firestore Database** erstellen (Produktionsmodus).
4. **Storage** aktivieren.
5. Web-App registrieren und die Config-Werte in `.env.local` (lokal) bzw. Vercel-Env eintragen.
6. `VITE_ADMIN_EMAILS` mit deiner E-Mail füllen.

Ohne Firebase läuft die App vollständig lokal (Fortschritt im Browser-localStorage).

### Firestore-Regeln (Start, anpassen)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }
    match /slides/{id} { allow read: if true; allow write: if request.auth != null; }
  }
}
```

Storage-Regeln: `slides/**` lesbar für alle, schreibbar nur für angemeldete Nutzer.

## Deploy auf Vercel

```bash
npm i -g vercel
vercel                     # Projekt verknüpfen
vercel env add OPENROUTER_API_KEY
vercel env add VITE_FIREBASE_API_KEY
# ... alle weiteren VITE_FIREBASE_* und VITE_ADMIN_EMAILS
vercel --prod
```

Vercel erkennt Vite automatisch (Build `npm run build`, Output `dist`). `vercel.json` regelt das SPA-Routing, `api/ai/chat.ts` übernimmt den KI-Proxy.

## Folien nachträglich ergänzen

Im Admin-Bereich (`/admin`) können für fehlende Wochen Folien/Unterlagen als PDF/PPTX hochgeladen werden. Sie erscheinen im jeweiligen Modul unter dem Reiter "Folien". So lassen sich Wochen, deren Material noch nicht online ist, später befüllen.

## Datenmodell

```
scripts/build_*.py      -> erzeugt JSON-Inhalte
src/data/content/<fach>/{exams,modules,tasks}/*.json
src/data/registry.ts    -> Fächer-Metadaten (Farbe, Prüfungstyp)
```

Lösungsschlüssel der Altprüfungen sind KI-gestützt erstellt und mit den Unterlagen abgeglichen, aber keine offiziellen Musterlösungen. Im Resultat können sie manuell korrigiert werden.
