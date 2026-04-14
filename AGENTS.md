# Pupils — AGENTS.md

## Project Overview

SvelteKit PWA for a music teacher to track student progress. Works offline via PouchDB (IndexedDB) and syncs to CouchDB on Raspberry Pi via Tailscale.

- **App**: `app/` — SvelteKit 5 PWA
- **Stack**: `stack/` — Docker (CouchDB + nginx + backup)
- **Docs**: `docs/` — Deployment, first-run, disaster recovery

---

## Key Commands

```bash
cd app/
npm run dev      # Start dev server (http://localhost:5173)
npm run check    # TypeScript check (svelte-kit sync && svelte-check)
npm run build    # Production build → app/build/
npm run preview  # Preview production build
```

**Dev CouchDB**: `docker compose -f docker-compose.dev.yml up -d` → http://localhost:5984/_utils (admin/devpassword)

---

## Critical Vite Config

`app/vite.config.ts` **must** include these `define` entries — PouchDB checks `process.browser` at runtime:

```ts
define: {
  global: 'globalThis',
  'process.browser': 'true',
  'process.env': '{}',
}
```

Without them: `ReferenceError` at runtime → blank white page.

---

## Svelte 5 State Rules

- **In `.svelte` files**: Use `$state()` rune
- **In `.ts` files**: Use `writable()` from `svelte/store` — NOT `$state`
- `$state` only works in files with Svelte rune processing (`.svelte` or `.svelte.ts`)

---

## PouchDB TypeScript

`@types/pouchdb-browser` and `@types/pouchdb-find` are **devDependencies** — without them `npm run check` fails.

---

## Build & Adapter

- Uses `@sveltejs/adapter-static` with `fallback: 'index.html'` — required for SPA routing
- Production build output: `app/build/`
- Docker build context is repo root (`..`), so `app/` is accessible during image build

---

## Data Model (ID prefixes)

| Type | ID format |
|------|-----------|
| Student | `student:<ulid>` |
| Song | `song:<studentUlid>:<songUlid>` |
| Entry | `entry:<songUlid>:<invTimestamp>:<entryUlid>` |

Entry IDs use inverted timestamps so `allDocs` returns newest first.

---

## Docker Stack

- **CouchDB**: `127.0.0.1:5984` — only localhost, Tailscale for remote
- **pupils-app**: `127.0.0.1:8099` — nginx serving SPA
- **backup**: nightly cron → filen.io
- **Setup init**: `couchdb-setup` service runs `00-setup.sh` after CouchDB is healthy (idempotent, `|| true`)
- **Build context**: repo root (`..`) — required for `pupils-app` multi-stage build

---

## Credentials

Never commit `stack/.env`. Required env vars:
- `COUCHDB_ADMIN_PASSWORD` — ≥24 chars
- `TEACHER_PASSWORD` — ≥16 chars (app login)
- `FILEN_EMAIL` / `FILEN_PASSWORD` — backup upload

---

## Architecture Notes

- `src/routes/+layout.ts`: `ssr = false`, `prerender = true`
- First-run guard: no config in localStorage → redirect to `/setup`
- Sync status emitted via `onSyncStatus()` callback set in `onMount`
- Config stored in localStorage key `pupilsConfig`
