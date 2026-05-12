<script lang="ts">
  import { ClipboardPaste, Play } from 'lucide-svelte';
  import type { GameConfig } from '../types';
  import { boardToGridLetters, getBoardLetters, validateGameConfig } from '../services/gameConfig';
  import Modal from './Modal.svelte';

  export let open = false;
  export let onClose: () => void = () => {};
  export let onImport: (config: GameConfig) => void = () => {};

  let configText = '';
  let error = '';

  async function pasteFromClipboard() {
    error = '';
    try {
      configText = await navigator.clipboard.readText();
    } catch {
      error = 'Impossibile leggere dagli appunti.';
    }
  }

  function close() {
    configText = '';
    error = '';
    onClose();
  }

  function importConfig() {
    error = '';

    try {
      const parsed = JSON.parse(configText.trim()) as GameConfig;
      const validation = validateGameConfig(parsed);
      if (!validation.valid) {
        error = validation.error ?? 'Configurazione non valida.';
        return;
      }

      onImport({
        'grid-size': parsed['grid-size'],
        'min-word-length': parsed['min-word-length'],
        'duration-sec': parsed['duration-sec'],
        letters: boardToGridLetters(getBoardLetters(parsed)),
      });
      close();
    } catch {
      error = 'JSON non valido.';
    }
  }
</script>

<Modal {open} title="Importa partita" wide onClose={close}>
  <div class="importer">
    <label for="config-json">Configurazione JSON</label>
    <div class="textarea-shell">
      <textarea
        id="config-json"
        bind:value={configText}
        rows="9"
        spellcheck="false"
      ></textarea>
      <button class="icon-button paste" type="button" aria-label="Incolla" on:click={pasteFromClipboard}>
        <ClipboardPaste size={19} />
      </button>
    </div>

    {#if error}
      <p class="form-error">{error}</p>
    {/if}

    <div class="modal-actions">
      <button class="button secondary" type="button" on:click={close}>Annulla</button>
      <button class="button primary" type="button" on:click={importConfig} disabled={!configText.trim()}>
        <Play size={18} />
        Inizia
      </button>
    </div>
  </div>
</Modal>

<style>
  .importer {
    display: grid;
    gap: 0.75rem;
  }

  label {
    font-size: 0.9rem;
    font-weight: 700;
  }

  .textarea-shell {
    position: relative;
  }

  textarea {
    width: 100%;
    resize: vertical;
    min-height: 12rem;
    padding: 0.8rem 3rem 0.8rem 0.8rem;
    border: 1px solid var(--border);
    border-radius: 0;
    background: var(--surface-muted);
    color: var(--ink);
    font: 0.9rem ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    line-height: 1.45;
  }

  textarea:focus {
    border-color: var(--accent);
    outline: 2px solid color-mix(in srgb, var(--accent) 25%, transparent);
    outline-offset: 1px;
  }

  .paste {
    position: absolute;
    right: 0.6rem;
    bottom: 0.6rem;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
</style>
