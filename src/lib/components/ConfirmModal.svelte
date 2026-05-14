<script lang="ts">
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
    <p>{message}</p>

    <div class="confirm-actions">
      <button class="button secondary" type="button" on:click={onCancel}>{cancelLabel}</button>
      <button class:danger class:reveal={!danger} class="button" type="button" on:click={onConfirm}>{confirmLabel}</button>
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
