# RoyalOS Full Update — 2026-07-14

## Install in a fresh folder

1. Stop the current server with `Ctrl + C`.
2. Keep the current working project or ZIP as a backup.
3. Extract this package into a new empty `royalos-app` folder.
4. Copy your private `.env.local` from the backup into the new folder.
5. Do not upload or share `.env.local`.
6. Run:

```bash
npm install
npm run dev
```

7. Open `http://localhost:3000`.

## What this package includes

- Cine and Michael P employee configuration
- Cine Video Studio
- Michael P Records Center
- Ifeoluwa browser conversation history
- Connections & Publishing Center
- Social and company integration registry
- Employee connection permission matrix
- Emmy publishing queue and approval preparation
- Cine-to-Emmy production-plan handoff
- Updated roadmap and knowledge files
- Expanded `.env.example` for planned provider connections

## What remains locked

- Real social OAuth authorization
- Encrypted access-token persistence
- Real publishing and scheduling
- Live analytics retrieval
- Real video generation and rendering
- Michael P document intake and accounting persistence

These remain locked until the required provider applications, secure Supabase tables, adapters, and approval/audit flows are implemented.

## Validation

- `npx tsc --noEmit` passes.
- `npm run build` passes when safe placeholder Supabase values are supplied during build validation.
- The only current build warning is the existing Turbopack project-tracing warning from the Orion developer security code.
