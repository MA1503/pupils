<script lang="ts">
  import type { Billing } from '$lib/types';
  
  interface Props {
    billing: Billing | undefined;
  }
  
  let { billing }: Props = $props();
  
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' });
  }
</script>

{#if billing && billing.type !== 'free'}
  {#if billing.type === 'card'}
    {@const used = billing.charges?.length || 0}
    {@const remaining = billing.size - used}
    {@const badgeColor = remaining <= 0 ? 'bg-error-container text-on-error-container' : remaining <= 1 ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container-highest text-on-surface-variant'}
    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold {badgeColor}">
      {billing.size}er · noch {remaining}
    </span>
  {:else if billing.type === 'contract'}
    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-surface-container-highest text-on-surface-variant">
      Festvertrag · seit {formatDate(billing.startDate)}
    </span>
  {/if}
{/if}
