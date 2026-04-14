<script lang="ts">
  import type { Song } from '$lib/types';
  let {
    songs,
    active,
    onSelect,
    onAdd
  }: {
    songs: Song[];
    active: number;
    onSelect: (i: number) => void;
    onAdd: () => void;
  } = $props();
</script>

<div class="tabs" role="tablist">
  {#each songs as song, i (song._id)}
    <button
      role="tab"
      aria-selected={i === active}
      class:active={i === active}
      onclick={() => onSelect(i)}
    >{song.title}</button>
  {/each}
  <button class="add-tab" onclick={onAdd} aria-label="Song hinzufügen">+</button>
</div>

<style>
  .tabs {
    display: flex;
    overflow-x: auto;
    border-bottom: 2px solid #eee;
    margin-bottom: 1rem;
    gap: 0.25rem;
    padding-bottom: 0;
  }
  button {
    flex-shrink: 0;
    padding: 0.5rem 0.75rem;
    border: none;
    background: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    cursor: pointer;
    font-size: 0.9rem;
    white-space: nowrap;
  }
  button.active { border-bottom-color: #1a1a1a; font-weight: 600; }
  .add-tab { color: #666; font-size: 1.1rem; }
</style>
