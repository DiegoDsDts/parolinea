<script lang="ts">
  import {
    BookOpen,
    Clock3,
    Download,
    Edit3,
    Gauge,
    Grid3X3,
    Settings,
    Shuffle,
    Type,
  } from 'lucide-svelte';
  import type { DictionaryStatus, GameConfig, StartGameOptions, WordQuantityMode } from '../types';
  import {
    createManualGameConfig,
    formatSolutionScoreRange,
    generateGameConfig,
    getSolutionScoreRange,
  } from '../services/gameConfig';
  import { createEmptyBoard } from '../services/letters';
  import CustomSelect from './CustomSelect.svelte';
  import ImportGameModal from './ImportGameModal.svelte';
  import ManualBoardEditor from './ManualBoardEditor.svelte';

  export let dictionaryStatus: DictionaryStatus;
  export let onStart: (config: GameConfig, options?: StartGameOptions) => void = () => {};
  export let onInfo: () => void = () => {};
  export let onSettings: () => void = () => {};
  export let startSignal = 0;

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
  const wordQuantityOptions: Array<{ label: string; value: WordQuantityMode }> = [
    { label: 'Random', value: 'random' },
    { label: 'Basso', value: 'low' },
    { label: 'Medio', value: 'medium' },
    { label: 'Alto', value: 'high' },
  ];

  let gridSize = 5;
  let gameTime = 0;
  let minWordLength = 5;
  let wordQuantityMode: WordQuantityMode = 'random';
  let manualMode = false;
  let manualBoard = createEmptyBoard(gridSize);
  let manualEditorOpen = false;
  let importOpen = false;
  let validationError = '';
  let lastStartSignal = startSignal;

  $: if (manualBoard.length !== gridSize || manualBoard[0]?.length !== gridSize) {
    manualBoard = createEmptyBoard(gridSize);
  }

  $: gridSelectOptions = gridOptions.map((option) => ({
    label: `${option}x${option}`,
    value: option,
  }));
  $: minWordLengthSelectOptions = minWordLengthOptions.map((option) => ({
    label: String(option),
    value: option,
  }));
  $: selectedScoreRange = manualMode ? null : getSolutionScoreRange(wordQuantityMode, gridSize, minWordLength);
  $: selectedScoreRangeLabel = manualMode ? 'Solo auto' : formatSolutionScoreRange(selectedScoreRange);
  $: quantityDetailLabel = validationError || selectedScoreRangeLabel;
  $: if (startSignal !== lastStartSignal) {
    lastStartSignal = startSignal;
    startGame();
  }

  function startGame() {
    validationError = '';

    if (!dictionaryStatus.ready) {
      validationError = 'Dizionario';
      return;
    }

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

    onStart(config, {
      wordQuantityMode: manualMode ? 'random' : wordQuantityMode,
    });
  }

  function saveManualBoard(board: string[][]) {
    manualBoard = board;
  }

  function importGame(config: GameConfig) {
    onStart(config);
  }
</script>

<div class="home-board" aria-label="Configurazione partita">
  <div class="board-tile field-tile">
    <Grid3X3 size={22} />
    <span>Griglia</span>
    <CustomSelect bind:value={gridSize} options={gridSelectOptions} ariaLabel="Dimensione griglia" />
  </div>

  <div class="board-tile field-tile">
    <Type size={22} />
    <span>Minima</span>
    <CustomSelect bind:value={minWordLength} options={minWordLengthSelectOptions} ariaLabel="Lunghezza minima" />
  </div>

  <div class="board-tile field-tile">
    <Clock3 size={22} />
    <span>Tempo</span>
    <CustomSelect bind:value={gameTime} options={timeOptions} ariaLabel="Durata partita" />
  </div>

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

  <div class="board-tile field-tile quantity-tile">
    <Gauge size={23} />
    <span>Parole</span>
    <CustomSelect bind:value={wordQuantityMode} options={wordQuantityOptions} ariaLabel="Quantita parole" />
    <small>{quantityDetailLabel}</small>
  </div>
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

  .field-tile :global(.custom-select) {
    width: min(100%, 6.8rem);
  }

  .mini-toggle {
    width: min(100%, 7.35rem);
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 0.18rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface-muted);
    margin-top: 0.4rem;
  }

  .mini-toggle button {
    min-width: 0;
    min-height: 2.15rem;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: clamp(0.78rem, 2.1vw, 0.9rem);
    font-weight: 850;
    cursor: pointer;
  }

  .mini-toggle button.active {
    background: var(--accent);
    color: white;
  }

  @media (max-width: 560px) {
    .mini-toggle button {
      min-height: 2.45rem;
    }
  }

  .quantity-tile {
    gap: 0.24rem;
    border-color: color-mix(in srgb, var(--accent) 42%, var(--tile-border));
    background: color-mix(in srgb, var(--accent) 10%, var(--tile));
    color: var(--accent-strong);
  }

  .quantity-tile :global(.custom-select) {
    margin-top: 0.12rem;
  }

  .quantity-tile :global(.select-trigger) {
    min-height: 2.2rem;
  }

  @media (max-width: 560px) {
    .quantity-tile :global(.select-trigger) {
      min-height: 2.35rem;
    }
  }
</style>
