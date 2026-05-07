<script lang="ts">
  import {
    BookOpen,
    Clock3,
    Download,
    Edit3,
    Grid3X3,
    Play,
    Settings,
    Shuffle,
    Type,
  } from 'lucide-svelte';
  import type { DictionaryStatus, GameConfig } from '../types';
  import { createManualGameConfig, formatDuration, generateGameConfig } from '../services/gameConfig';
  import { createEmptyBoard } from '../services/letters';
  import ImportGameModal from './ImportGameModal.svelte';
  import ManualBoardEditor from './ManualBoardEditor.svelte';

  export let dictionaryStatus: DictionaryStatus;
  export let onStart: (config: GameConfig) => void = () => {};
  export let onInfo: () => void = () => {};
  export let onSettings: () => void = () => {};

  const gridOptions = [3, 4, 5, 6, 7, 8];
  const minWordLengthOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const timeOptions = [
    { label: '∞', value: 0 },
    { label: '15s', value: 15 },
    { label: '30s', value: 30 },
    { label: '1m', value: 60 },
    { label: '2m', value: 120 },
    { label: '3m', value: 180 },
    { label: '5m', value: 300 },
    { label: '10m', value: 600 },
    { label: '30m', value: 1800 },
    { label: '60m', value: 3600 },
  ];

  let gridSize = 4;
  let gameTime = 0;
  let minWordLength = 4;
  let manualMode = false;
  let manualBoard = createEmptyBoard(gridSize);
  let manualEditorOpen = false;
  let importOpen = false;
  let validationError = '';

  $: if (manualBoard.length !== gridSize || manualBoard[0]?.length !== gridSize) {
    manualBoard = createEmptyBoard(gridSize);
  }

  function startGame() {
    validationError = '';

    if (manualMode) {
      const hasMissingCells = manualBoard.some((row) => row.some((cell) => !cell));
      if (hasMissingCells) {
        validationError = 'Completa la griglia manuale.';
        return;
      }
    }

    const config = manualMode
      ? createManualGameConfig(gridSize, minWordLength, gameTime, manualBoard)
      : generateGameConfig(gridSize, minWordLength, gameTime);

    onStart(config);
  }

  function saveManualBoard(board: string[][]) {
    manualBoard = board;
  }

  function importGame(config: GameConfig) {
    onStart(config);
  }
</script>

<div class="home-board" aria-label="Configurazione partita">
  <label class="board-tile field-tile">
    <Grid3X3 size={22} />
    <span>Griglia</span>
    <select bind:value={gridSize} aria-label="Dimensione griglia">
      {#each gridOptions as option}
        <option value={option}>{option}x{option}</option>
      {/each}
    </select>
  </label>

  <label class="board-tile field-tile">
    <Type size={22} />
    <span>Minima</span>
    <select bind:value={minWordLength} aria-label="Lunghezza minima">
      {#each minWordLengthOptions as option}
        <option value={option}>{option}</option>
      {/each}
    </select>
  </label>

  <label class="board-tile field-tile">
    <Clock3 size={22} />
    <span>Tempo</span>
    <select bind:value={gameTime} aria-label="Durata partita">
      {#each timeOptions as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </label>

  <div class="board-tile mode-tile">
    <Shuffle size={22} />
    <span>Lettere</span>
    <div class="mini-toggle" aria-label="Modalita griglia">
      <button class:active={!manualMode} type="button" on:click={() => (manualMode = false)}>Auto</button>
      <button class:active={manualMode} type="button" on:click={() => (manualMode = true)}>Man.</button>
    </div>
  </div>

  <button
    class="board-tile action-tile"
    type="button"
    disabled={!manualMode}
    on:click={() => (manualEditorOpen = true)}
  >
    <Edit3 size={23} />
    <span>Modifica</span>
    <small>{manualMode ? `${gridSize}x${gridSize}` : 'Auto'}</small>
  </button>

  <button class="board-tile action-tile" type="button" on:click={() => (importOpen = true)}>
    <Download size={23} />
    <span>Importa</span>
    <small>JSON</small>
  </button>

  <button class="board-tile action-tile" type="button" on:click={onInfo}>
    <BookOpen size={23} />
    <span>Info</span>
    <small>Regole</small>
  </button>

  <button class="board-tile action-tile" type="button" on:click={onSettings}>
    <Settings size={23} />
    <span>Opzioni</span>
    <small>Tema</small>
  </button>

  <button
    class="board-tile start-tile"
    type="button"
    disabled={!dictionaryStatus.ready}
    on:click={startGame}
  >
    <Play size={26} />
    <span>Gioca</span>
    <small>{validationError || (dictionaryStatus.ready ? formatDuration(gameTime) : 'Dizionario')}</small>
  </button>
</div>

<ManualBoardEditor
  open={manualEditorOpen}
  {gridSize}
  boardLetters={manualBoard}
  onClose={() => (manualEditorOpen = false)}
  onSave={saveManualBoard}
/>

<ImportGameModal open={importOpen} onClose={() => (importOpen = false)} onImport={importGame} />

<style>
  .home-board {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(3, minmax(0, 1fr));
    gap: var(--board-gap);
  }

  .board-tile {
    min-width: 0;
    min-height: 0;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 0.38rem;
    padding: clamp(0.42rem, 1.8vw, 0.72rem);
    border: 1px solid var(--tile-border);
    border-radius: 6px;
    background: var(--tile);
    color: var(--ink);
    box-shadow: var(--shadow-sm);
    text-align: center;
  }

  button.board-tile {
    cursor: pointer;
  }

  button.board-tile:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .board-tile span {
    min-width: 0;
    overflow-wrap: anywhere;
    font-size: clamp(0.76rem, 2.6vw, 1.04rem);
    font-weight: 850;
    line-height: 1;
  }

  .board-tile small {
    min-height: 1em;
    color: var(--muted);
    font-size: clamp(0.62rem, 2vw, 0.76rem);
    font-weight: 750;
    line-height: 1.1;
  }

  .field-tile select {
    width: min(100%, 5.8rem);
    min-height: 1.9rem;
    padding: 0 0.4rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface-muted);
    color: var(--ink);
    font: inherit;
    font-size: clamp(0.72rem, 2.1vw, 0.9rem);
    font-weight: 800;
    text-align: center;
  }

  .mini-toggle {
    width: min(100%, 6.8rem);
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 0.14rem;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--surface-muted);
  }

  .mini-toggle button {
    min-width: 0;
    min-height: 1.65rem;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: clamp(0.62rem, 2vw, 0.76rem);
    font-weight: 850;
    cursor: pointer;
  }

  .mini-toggle button.active {
    background: var(--accent);
    color: white;
  }

  .start-tile {
    border-color: color-mix(in srgb, var(--accent) 42%, var(--tile-border));
    background: color-mix(in srgb, var(--accent) 10%, var(--tile));
    color: var(--accent-strong);
  }
</style>
