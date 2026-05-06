<script lang="ts">
  import { Check } from 'lucide-svelte';
  import { createEmptyBoard } from '../services/letters';
  import { normalizeBoard } from '../services/gameConfig';
  import Modal from './Modal.svelte';

  export let open = false;
  export let gridSize = 4;
  export let boardLetters: string[][] = [];
  export let onClose: () => void = () => {};
  export let onSave: (board: string[][]) => void = () => {};

  let localBoard: string[][] = createEmptyBoard(gridSize);
  let previousOpen = open;
  let previousGridSize = gridSize;

  function fitBoard(board: string[][], size: number): string[][] {
    return Array.from({ length: size }, (_, rowIndex) =>
      Array.from({ length: size }, (_, colIndex) => board[rowIndex]?.[colIndex] ?? ''),
    );
  }

  $: if ((open && !previousOpen) || gridSize !== previousGridSize) {
    localBoard = fitBoard(boardLetters, gridSize);
    previousGridSize = gridSize;
  }

  $: previousOpen = open;

  function updateCell(event: Event, rowIndex: number, colIndex: number) {
    const input = event.currentTarget as HTMLInputElement;
    const value = input.value.replace(/[^A-Za-z]/g, '').slice(0, 1).toUpperCase();
    input.value = value;
    localBoard = localBoard.map((row, r) =>
      row.map((cell, c) => (r === rowIndex && c === colIndex ? value : cell)),
    );
  }

  function save() {
    onSave(normalizeBoard(localBoard));
    onClose();
  }
</script>

<Modal {open} title="Configura la griglia" wide onClose={onClose}>
  <div class="editor">
    <div
      class="manual-grid"
      style={`--grid-size: ${gridSize};`}
      aria-label="Lettere griglia manuale"
    >
      {#each localBoard as row, rowIndex}
        {#each row as cell, colIndex}
          <input
            aria-label={`Riga ${rowIndex + 1}, colonna ${colIndex + 1}`}
            maxlength="1"
            value={cell}
            inputmode="text"
            autocomplete="off"
            autocapitalize="characters"
            on:input={(event) => updateCell(event, rowIndex, colIndex)}
          />
        {/each}
      {/each}
    </div>

    <div class="modal-actions">
      <button class="button secondary" type="button" on:click={onClose}>Annulla</button>
      <button class="button primary" type="button" on:click={save}>
        <Check size={18} />
        Salva
      </button>
    </div>
  </div>
</Modal>

<style>
  .editor {
    display: grid;
    gap: 1rem;
  }

  .manual-grid {
    width: min(100%, 28rem);
    margin-inline: auto;
    display: grid;
    grid-template-columns: repeat(var(--grid-size), minmax(2.2rem, 1fr));
    gap: 0.45rem;
  }

  input {
    width: 100%;
    aspect-ratio: 1;
    border: 1px solid var(--tile-border);
    border-radius: 6px;
    background: var(--tile);
    color: var(--ink);
    font: inherit;
    font-size: 1.35rem;
    font-weight: 800;
    text-align: center;
    text-transform: uppercase;
  }

  input:focus {
    border-color: var(--accent);
    outline: 2px solid color-mix(in srgb, var(--accent) 28%, transparent);
    outline-offset: 1px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  @media (max-width: 520px) {
    .manual-grid {
      gap: 0.32rem;
      grid-template-columns: repeat(var(--grid-size), minmax(1.8rem, 1fr));
    }

    input {
      font-size: 1.05rem;
    }
  }
</style>
