# Our Story ♡

A private digital scrapbook for two people — photo booth + diary + freeform canvas editor.

- **`/`** — the viewer. Full-screen pages with PowerPoint-style transitions. Swipe on phone, arrow keys on desktop. Public.
- **`/editor`** — the studio. Password-protected canvas editor: drag, resize, rotate photos, text, and stickers anywhere on the page.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

First set your password in `.env.local`:

```
EDITOR_PASSWORD=your-secret-word
AUTH_SECRET=any-random-string
```

## How it works

- Every page is a JSON document of positioned elements (photo / text / sticker with `x, y, w, h, rotation, z`), designed on a fixed 1080×1440 canvas and scaled to fit any screen — so it looks identical on every device.
- Everything (writings **and** photos) is stored in one SQLite database at `data/ourstory.db`. **Back that one file up and you've backed up everything.**
- Autosave runs ~1 second after every change. Each save snapshots the previous state; the **History** button in the editor shows the last 50 versions per page with one-click restore.

## Editor tips

- Double-click text to edit it. Drag corners to resize, the ⟳ handle to rotate.
- Delete key removes the selected element; arrow keys nudge it (Shift = bigger steps).
- Polaroid frames have a handwritten caption line — perfect for dates.
- Each page has its own transition (fade / slide / zoom / flip / rise) and background tint.
