<script lang="ts">
  import type { Student } from '$lib/types';
  let { student }: { student: Student } = $props();
</script>

<li>
  <a href="/s/{student._id}">
    <span class="name">{student.name}</span>
    <span class="slot">{student.lessonSlot}</span>
  </a>
</li>

<style>
  li { border-bottom: 1px solid #eee; }
  a {
    display: flex;
    flex-direction: column;
    padding: 0.75rem 0;
    text-decoration: none;
    color: inherit;
  }
  a:hover { background: #f9f9f9; }
  .name { font-size: 1.05rem; font-weight: 500; }
  .slot { font-size: 0.85rem; color: #666; }
</style>
