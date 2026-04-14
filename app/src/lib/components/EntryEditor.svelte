<script lang="ts">
  import type { Entry } from '$lib/types';

  let {
    entry,
    onSave,
    onDelete
  }: {
    entry: Entry;
    onSave: (entry: Entry, text: string) => void;
    onDelete: (entry: Entry) => void;
  } = $props();

  let editing = $state(entry.text === '');
  let draft = $state(entry.text);

  function save() {
    if (draft !== entry.text || entry.text === '') {
      onSave(entry, draft);
    }
    editing = false;
  }

  function handleBlur() {
    save();
  }
</script>

<li class="entry">
  <div class="entry-date">
    {new Date(entry.entryDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
  </div>

  {#if editing}
    <textarea
      bind:value={draft}
      onblur={handleBlur}
      rows="4"
      placeholder="Notiz schreiben…"
      autofocus
    ></textarea>
    <div class="actions">
      <button onclick={save}>Fertig</button>
      <button class="delete" onclick={() => onDelete(entry)}>Löschen</button>
    </div>
  {:else}
    <div
      class="entry-text"
      role="button"
      tabindex="0"
      onclick={() => { editing = true; draft = entry.text; }}
      onkeydown={(e) => e.key === 'Enter' && (editing = true)}
    >
      {entry.text || '(leer — tippen zum Bearbeiten)'}
    </div>
  {/if}
</li>

<style>
  .entry { border-bottom: 1px solid #eee; padding: 0.75rem 0; }
  .entry-date { font-size: 0.8rem; font-weight: 600; color: #555; margin-bottom: 0.4rem; }
  .entry-text {
    white-space: pre-wrap;
    cursor: pointer;
    min-height: 1.5rem;
    color: #333;
    line-height: 1.5;
  }
  .entry-text:hover { color: #000; }
  textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #1a1a1a;
    border-radius: 4px;
    font-size: 1rem;
    line-height: 1.5;
    resize: vertical;
    font-family: inherit;
  }
  .actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
  .actions button { padding: 0.4rem 0.75rem; border-radius: 4px; cursor: pointer; border: 1px solid #ccc; background: white; }
  .actions button:first-child { background: #1a1a1a; color: white; border-color: #1a1a1a; }
  .delete { color: #c00; }
</style>
