<script lang="ts">
  import { X } from 'lucide-svelte';

  export let open = false;
  export let title = '';
  export let wide = false;
  export let onClose: () => void = () => {};

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose();
  }
</script>

{#if open}
  <div
    class="modal-backdrop"
    role="presentation"
    on:click={onClose}
    on:keydown={handleKeydown}
  >
    <div
      class:wide
      class="modal-panel"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabindex="-1"
      on:click|stopPropagation
      on:keydown|stopPropagation
    >
      <header class="modal-header">
        <h2>{title}</h2>
        <button class="icon-button" type="button" aria-label="Chiudi" on:click={onClose}>
          <X size={20} />
        </button>
      </header>
      <div class="modal-body">
        <slot />
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: color-mix(in srgb, var(--ink) 58%, transparent);
  }

  .modal-panel {
    width: min(100%, 32rem);
    max-height: min(86vh, 52rem);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-lg);
  }

  .modal-panel.wide {
    width: min(100%, 54rem);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.9rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface-muted);
  }

  h2 {
    margin: 0;
    font-size: 1rem;
    line-height: 1.2;
  }

  .modal-body {
    min-height: 0;
    overflow: auto;
    padding: 1rem;
  }
</style>
