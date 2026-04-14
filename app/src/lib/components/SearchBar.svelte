<script lang="ts">
  let { value = $bindable('') } = $props();
  let timeout: ReturnType<typeof setTimeout>;

  function onInput(e: Event) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      value = (e.target as HTMLInputElement).value;
    }, 200);
  }
</script>

<input
  type="search"
  placeholder="Schüler suchen…"
  value={value}
  oninput={onInput}
  class="search"
/>

<style>
  .search {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 1rem;
  }
</style>
