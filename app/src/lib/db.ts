// src/lib/db.ts
import PouchDB from 'pouchdb-browser';
import PouchFind from 'pouchdb-find';
PouchDB.plugin(PouchFind);

let local: PouchDB.Database | null = null;
let syncHandler: PouchDB.Replication.Sync<object> | null = null;

export function getLocal(): PouchDB.Database {
  if (!local) local = new PouchDB('pupils');
  return local;
}

// --------------- Sync-Status-Emitter ---------------
import type { SyncStatus } from './types';

type StatusListener = (s: SyncStatus, detail?: unknown) => void;
const listeners = new Set<StatusListener>();

export function onSyncStatus(cb: StatusListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit(s: SyncStatus, d?: unknown) {
  listeners.forEach(l => l(s, d));
}

// --------------- Config in localStorage ---------------
const CONFIG_KEY = 'pupilsConfig';

export function loadConfig(): { url: string; user: string; pass: string } | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveConfig(url: string, user: string, pass: string) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, user, pass }));
}

export function clearConfig() {
  localStorage.removeItem(CONFIG_KEY);
}

// --------------- Sync starten/stoppen ---------------
export function startSync(remoteUrl: string, user: string, pass: string) {
  stopSync();
  const remote = new PouchDB(remoteUrl, {
    fetch: (url, opts) => {
      const options = opts ?? {};
      const headers = new Headers(options.headers as HeadersInit | undefined);
      headers.set('Authorization', 'Basic ' + btoa(`${user}:${pass}`));
      return fetch(url as RequestInfo, { ...options, headers });
    }
  });

  syncHandler = getLocal()
    .sync(remote, { live: true, retry: true })
    .on('active',  ()  => emit('active'))
    .on('paused',  (e) => emit(e ? 'error' : 'paused', e))
    .on('denied',  (e) => emit('denied', e))
    .on('error',   (e) => emit('error', e));
}

export function stopSync() {
  syncHandler?.cancel();
  syncHandler = null;
}

/** Verbindungstest beim Setup — wirft bei Fehler */
export async function testConnection(url: string, user: string, pass: string): Promise<void> {
  // URL endet auf /pupils — wir testen /_session am CouchDB-Root
  const base = url.replace(/\/[^/]+$/, '');
  const resp = await fetch(`${base}/_session`, {
    headers: { Authorization: 'Basic ' + btoa(`${user}:${pass}`) }
  });
  if (resp.status === 401) throw new Error('401: Falscher Benutzername oder Passwort');
  if (!resp.ok) throw new Error(`${resp.status}: Server nicht erreichbar`);
  let data: { ok?: boolean; userCtx?: { name: string } };
  try {
    data = await resp.json();
  } catch {
    throw new Error('Keine gültige CouchDB-Antwort — URL korrekt? (erwartet: http://host:5984/datenbankname)');
  }
  if (!data?.ok && !data?.userCtx?.name) {
    throw new Error('Authentifizierung fehlgeschlagen');
  }
}
