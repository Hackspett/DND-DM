# DND-DM

A local-first workspace for D&D Dungeon Masters. The React and TypeScript UI
uses Mantine components with a custom dark and green theme, plus a Node.js API
and a local SQLite database. No hosted account or database is required.

## Requirements

- Node.js 22.18 or newer
- npm

## Development

```sh
npm install
npm run dev
```

This starts the Vite UI and local API together. Open the Vite URL printed in
the terminal.

## Source layout

Feature-specific pages and logic live in `src/features/<feature>`. Reusable UI
and helpers live in `src/shared`.

## Production

```sh
npm run build
npm start
```

The local server serves the built UI and API at `http://127.0.0.1:3001` by
default. Set `PORT` to change the port.

## Local data

The SQLite file is created at `data/hearthside.sqlite`, which is ignored by
Git. Set `DND_DM_DATA_DIR` to store it in a different directory. The server
binds to `127.0.0.1`, so it is only available on this computer by default.

The compendium has Monsters, Items, Gear, and Effects categories. Gear entries
can be weapons with a configurable damage dice expression, damage type, and
normal/long range in feet, or armor with an armor-class description. Campaigns
contain players, NPCs with optional creature stat blocks, nested location
folders, and prepared battles. Use Battles to create encounters; starting one
opens its live page and adds a battle-name link under Current Battles in the
sidebar. Multiple active encounters can run at once and are saved independently.
Configure monster spell-slot
totals in the compendium to track each enemy's remaining slots during an
encounter. These resources have shared notes with links to other
campaign or compendium resources; clicking a link opens that resource. Database
upgrades preserve existing freeform notes and active encounters. Note images
and profile pictures are stored in the same database; JPEG, PNG, WebP, and GIF
uploads are limited to 5 MB each. Back up the SQLite file to preserve your data.

Monster spell slots (levels 0–9, 0–4 each) and named spells can be configured in
the compendium. Spells can use a slot, an `X/day` pool shared by spells with the
same X, an `X/day each` per-spell allowance, or be at will. During a battle,
casting spends the appropriate slot or daily use and saves the remaining
resources with the active encounter. Older slot totals above 4 are reduced to 4
when loaded.

Run `npm test` to check the initiative calculations and ordering.
