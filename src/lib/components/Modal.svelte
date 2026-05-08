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
    background: color-mix(in srgb, var(--ink) 50%, transparent);
    backdrop-filter: blur(5px);
  }

  .modal-panel {
    width: min(100%, 32rem);
    max-height: min(86vh, 52rem);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    animation: modal-enter 140ms ease-out;
  }

  .modal-panel.wide {
    width: min(100%, 54rem);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.85rem 0.95rem;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--surface) 84%, var(--surface-muted));
  }

  h2 {
    margin: 0;
    font-size: 0.98rem;
    font-weight: 850;
    line-height: 1.2;
  }

  .modal-body {
    min-height: 0;
    overflow: auto;
    padding: 1rem;
  }

  @keyframes modal-enter {
    from {
      opacity: 0;
      transform: translateY(0.35rem) scale(0.985);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>
