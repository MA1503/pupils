<script lang="ts">
  import type { Entry } from '$lib/types';
  import EntryEditor from './EntryEditor.svelte';

  let {
    entries,
    onSave,
    onDelete
  }: {
    entries: Entry[];
    onSave: (entry: Entry, text: string) => void;
    onDelete: (entry: Entry) => void;
  } = $props();
</script>

{#if entries.length === 0}
  <p class="empty">Noch keine Einträge. Tipp auf "+ Heute".</p>
{:else}
  <ul class="entry-list">
    {#each entries as entry (entry._id)}
      <EntryEditor {entry} {onSave} {onDelete} />
    {/each}
  </ul>
{/if}

<style>
  .entry-list { list-style: none; padding: 0; margin: 0 0 5rem; }
  .empty { color: #666; text-align: center; margin-top: 2rem; }
</style>
