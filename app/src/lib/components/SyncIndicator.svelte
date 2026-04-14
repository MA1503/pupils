<script lang="ts">
  import { syncStatus } from '$lib/stores';
  const labels: Record<string, string> = {
    idle: '○', active: '●', paused: '◑', error: '✕', denied: '✕'
  };
  const colors: Record<string, string> = {
    idle: '#999', active: '#22c55e', paused: '#f59e0b', error: '#ef4444', denied: '#ef4444'
  };
</script>

<span
  class="sync"
  style="color: {colors[$syncStatus] ?? '#999'}"
  title="Sync: {$syncStatus}"
>
  {labels[$syncStatus] ?? '○'}
</span>

<style>
  .sync { font-size: 1rem; cursor: default; user-select: none; }
</style>
