<script lang="ts">
  import { AlertTriangle } from 'lucide-svelte';
  import Modal from './Modal.svelte';

  export let open = false;
  export let title = '';
  export let message = '';
  export let confirmLabel = 'Conferma';
  export let cancelLabel = 'Annulla';
  export let danger = false;
  export let onCancel: () => void = () => {};
  export let onConfirm: () => void = () => {};
</script>

<Modal {open} {title} onClose={onCancel}>
  <div class="confirm">
    <div class:danger class="confirm-icon" aria-hidden="true">
      <AlertTriangle size={24} />
    </div>

    <p>{message}</p>

    <div class="confirm-actions">
      <button class="button secondary" type="button" on:click={onCancel}>{cancelLabel}</button>
      <button class:danger class="button" type="button" on:click={onConfirm}>{confirmLabel}</button>
    </div>
  </div>
</Modal>

<style>
  .confirm {
    display: grid;
    justify-items: center;
    gap: 1rem;
    text-align: center;
  }

  .confirm-icon {
    width: 3rem;
    height: 3rem;
    display: grid;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
    border-radius: 8px;
    background: color-mix(in srgb, var(--accent) 8%, var(--surface));
    color: var(--accent-strong);
  }

  .confirm-icon.danger {
    border-color: color-mix(in srgb, var(--danger) 42%, var(--border));
    background: color-mix(in srgb, var(--danger) 8%, var(--surface));
    color: var(--danger);
  }

  p {
    max-width: 26rem;
    margin: 0;
    color: var(--muted);
    font-size: 0.95rem;
    line-height: 1.45;
  }

  .confirm-actions {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    gap: 0.65rem;
    padding-top: 0.1rem;
  }

  @media (max-width: 520px) {
    .confirm-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
