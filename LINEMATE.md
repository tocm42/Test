# 🎭 LineMate — rehearse your lines

A generic, single-file line-learning web app for actors. It reads **all the other
characters' lines aloud** using [ElevenLabs](https://elevenlabs.io) voices, then
pauses and waits for **you** to say your line, then continues — like having the
whole cast run the scene with you.

Works for **any** play: the script and your role are configurable each time.

## Use it

Open **`line-rehearsal.html`** directly in a browser (no build step, no server).
It's mobile-first — designed to be used on a phone.

1. Tap **⚙️ Settings**, paste your **ElevenLabs API key**, and tap **Load voices**.
   The key is stored only in your browser (`localStorage`); it is never hardcoded.
2. Paste a script or **Upload a file** (`.txt` or `.json`) and tap **Parse script**.
3. Pick **I am playing** (your role) and where to **Start from** (scene selector).
4. Tap **▶ Start rehearsing**.

During a run:
- Other characters' lines are spoken aloud, each with a distinct auto-assigned voice.
- On your line the app shows a **🎙 YOUR LINE** indicator and waits.
- **👁 Reveal** shows your full line if you blank; **Continue ▶** moves on.
- **Prompt mode** shows only the first two words of your line as a cue.
- **Back / Replay** let you move around the scene. Stage directions and scene
  headings are shown on screen (and optionally read aloud).

## Script formats

### Plain text (auto-parsed)
The parser detects:
- **Speakers** — `NAME.` / `NAME:` at the start of a line, a `**bold**` name, or a
  bare uppercase name on its own line with the dialogue following beneath it.
- **Stage directions** — text in `(parentheses)`, `[brackets]`, or `*italics*`.
- **Scene headings** — lines starting with `ACT` / `SCENE` / `INT.` / `EXT.`, or a
  short all-caps line preceded by a blank line.

```
ACT 1, SCENE 1

JULIET. O Romeo, Romeo, wherefore art thou Romeo?
(She leans on the balcony)
ROMEO. Shall I hear more, or shall I speak at this?
```

### Structured JSON (instant reload)
Export any successfully parsed script with **Export JSON** so it reloads instantly
next time without re-parsing. The format is one entry per line:

```json
{
  "title": "My Play",
  "format": "linemate-v1",
  "lines": [
    { "scene": "Act 1, Scene 1", "speaker": "JULIET", "text": "O Romeo…", "stageDirection": false },
    { "scene": "Act 1, Scene 1", "speaker": "",       "text": "She leans on the balcony", "stageDirection": true }
  ]
}
```
Field aliases are accepted on import (`dialogue`/`line` for `text`,
`character`/`role` for `speaker`, `isStageDirection` for `stageDirection`).

## Settings panel
Accessible at any time via **⚙️**:
- **ElevenLabs API key** input (not hardcoded).
- **Voice model** selector (quality / fast / fastest).
- **Voice assignment table** — one row per detected character, with a dropdown to
  override the auto-assigned voice. Your own role is never voiced.

## Technical notes
- Single HTML file, vanilla JavaScript, no dependencies or build step.
- Calls the ElevenLabs text-to-speech endpoint with `fetch`; audio is played via an
  `Audio` element. Generated clips are cached in-session so re-played lines are instant.
- All preferences, the API key, the voice catalog and assignments, and your last
  script are persisted in `localStorage`.
