<script lang="ts">
  import { onMount } from 'svelte';
  import {
    BookOpen,
    Check,
    ChevronDown,
    Clock3,
    Download,
    Edit3,
    Grid3X3,
    HelpCircle,
    Settings,
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
  import ImportGameModal from './ImportGameModal.svelte';
  import ManualBoardEditor from './ManualBoardEditor.svelte';
  import Modal from './Modal.svelte';

  type TileMenu = 'grid' | 'min' | 'time' | 'quantity';
  type TileOption<T extends string | number> = {
    label: string;
    value: T;
  };
  type HomeSettings = {
    gridSize: number;
    gameTime: number;
    minWordLength: number;
    wordQuantityMode: WordQuantityMode;
    manualMode: boolean;
    manualBoard: string[][];
  };

  export let dictionaryStatus: DictionaryStatus;
  export let onStart: (config: GameConfig, options?: StartGameOptions) => void = () => {};
  export let onInfo: () => void = () => {};
  export let onSettings: () => void = () => {};
  export let startSignal = 0;

  const HOME_SETTINGS_STORAGE_KEY = 'parolinea/home-settings';
  const gridOptions = [3, 4, 5, 6, 7, 8];
  const minWordLengthOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const timeOptions: Array<TileOption<number>> = [
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
  const wordQuantityOptions: Array<TileOption<WordQuantityMode>> = [
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
  let openMenu: TileMenu | null = null;
  let boardRoot: HTMLElement;
  let disabledInfoOpen = false;
  let disabledInfoTitle = '';
  let disabledInfoMessage = '';

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

  onMount(() => {
    loadHomeSettings();

    const closeFromOutside = (event: PointerEvent) => {
      if (boardRoot && !boardRoot.contains(event.target as Node)) openMenu = null;
    };

    document.addEventListener('pointerdown', closeFromOutside);
    return () => document.removeEventListener('pointerdown', closeFromOutside);
  });

  function toggleMenu(menu: TileMenu) {
    saveHomeSettings();
    openMenu = openMenu === menu ? null : menu;
  }

  function closeMenu() {
    openMenu = null;
  }

  function isWordQuantityMode(value: unknown): value is WordQuantityMode {
    return wordQuantityOptions.some((option) => option.value === value);
  }

  function isManualBoard(value: unknown, expectedGridSize: number): value is string[][] {
    return (
      Array.isArray(value) &&
      value.length === expectedGridSize &&
      value.every((row) =>
        Array.isArray(row) &&
        row.length === expectedGridSize &&
        row.every((cell) => typeof cell === 'string' && /^[A-Za-z]?$/.test(cell.trim())),
      )
    );
  }

  function normalizeManualBoard(board: string[][]): string[][] {
    return board.map((row) => row.map((cell) => cell.trim().slice(0, 1).toUpperCase()));
  }

  function loadHomeSettings() {
    try {
      const rawSettings = localStorage.getItem(HOME_SETTINGS_STORAGE_KEY);
      if (!rawSettings) return;

      const settings = JSON.parse(rawSettings) as Partial<HomeSettings>;
      if (typeof settings.gridSize === 'number' && gridOptions.includes(settings.gridSize)) {
        gridSize = settings.gridSize;
      }

      if (typeof settings.minWordLength === 'number' && minWordLengthOptions.includes(settings.minWordLength)) {
        minWordLength = settings.minWordLength;
      }

      if (typeof settings.gameTime === 'number' && timeOptions.some((option) => option.value === settings.gameTime)) {
        gameTime = settings.gameTime;
      }

      if (isWordQuantityMode(settings.wordQuantityMode)) {
        wordQuantityMode = settings.wordQuantityMode;
      }

      if (typeof settings.manualMode === 'boolean') {
        manualMode = settings.manualMode;
      }

      manualBoard = isManualBoard(settings.manualBoard, gridSize)
        ? normalizeManualBoard(settings.manualBoard)
        : createEmptyBoard(gridSize);
    } catch {
      try {
        localStorage.removeItem(HOME_SETTINGS_STORAGE_KEY);
      } catch {
        // Local storage can be unavailable in restricted browser contexts.
      }
    }
  }

  function saveHomeSettings() {
    const settings: HomeSettings = {
      gridSize,
      gameTime,
      minWordLength,
      wordQuantityMode,
      manualMode,
      manualBoard: normalizeManualBoard(manualBoard),
    };

    try {
      localStorage.setItem(HOME_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage failures: the current in-memory settings still work.
    }
  }

  function selectGridSize(value: number) {
    gridSize = value;
    manualBoard = createEmptyBoard(value);
    saveHomeSettings();
    closeMenu();
  }

  function selectMinWordLength(value: number) {
    minWordLength = value;
    saveHomeSettings();
    closeMenu();
  }

  function selectGameTime(value: number) {
    gameTime = value;
    saveHomeSettings();
    closeMenu();
  }

  function selectWordQuantity(value: WordQuantityMode) {
    wordQuantityMode = value;
    saveHomeSettings();
    closeMenu();
  }

  function toggleManualMode() {
    manualMode = !manualMode;
    saveHomeSettings();
  }

  function openInfo() {
    saveHomeSettings();
    onInfo();
  }

  function openSettings() {
    saveHomeSettings();
    onSettings();
  }

  function openManualEditor() {
    saveHomeSettings();

    if (!manualMode) {
      showDisabledInfo(
        'Configurazione non disponibile',
        'La configurazione delle lettere è disponibile solo quando il tasto "Lettere" è impostato su Manuale.',
      );
      return;
    }

    manualEditorOpen = true;
  }

  function openQuantityMenu() {
    saveHomeSettings();

    if (manualMode) {
      showDisabledInfo(
        'Densità non disponibile',
        'La densità si applica solo agli schemi generati in modalità Random. Imposta "Lettere" su Random per poterla utilizzare.',
      );
      return;
    }

    toggleMenu('quantity');
  }

  function showDisabledInfo(title: string, message: string) {
    openMenu = null;
    disabledInfoTitle = title;
    disabledInfoMessage = message;
    disabledInfoOpen = true;
  }

  function startGame() {
    validationError = '';
    saveHomeSettings();

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
    manualBoard = normalizeManualBoard(board);
    saveHomeSettings();
  }

  function importGame(config: GameConfig) {
    saveHomeSettings();
    onStart(config);
  }
</script>

<div class="home-board" aria-label="Configurazione partita" bind:this={boardRoot}>
  <div class="tile-menu-wrap">
    <button
      class:open={openMenu === 'grid'}
      class="board-tile choice-tile"
      type="button"
      aria-haspopup="listbox"
      aria-expanded={openMenu === 'grid'}
      on:click={() => toggleMenu('grid')}
    >
      <Grid3X3 size={22} />
      <span>Griglia</span>
      <strong>{gridSize}x{gridSize}</strong>
      <span class="tile-chevron"><ChevronDown size={16} /></span>
    </button>

    {#if openMenu === 'grid'}
      <div class="tile-menu" role="listbox" aria-label="Dimensione griglia">
        {#each gridSelectOptions as option}
          <button class:selected={option.value === gridSize} type="button" role="option" aria-selected={option.value === gridSize} on:click={() => selectGridSize(option.value)}>
            <span>{option.label}</span>
            {#if option.value === gridSize}<Check size={15} />{/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="tile-menu-wrap">
    <button
      class:open={openMenu === 'min'}
      class="board-tile choice-tile"
      type="button"
      aria-haspopup="listbox"
      aria-expanded={openMenu === 'min'}
      on:click={() => toggleMenu('min')}
    >
      <Type size={22} />
      <span>Minima</span>
      <strong>{minWordLength}</strong>
      <span class="tile-chevron"><ChevronDown size={16} /></span>
    </button>

    {#if openMenu === 'min'}
      <div class="tile-menu" role="listbox" aria-label="Lunghezza minima">
        {#each minWordLengthSelectOptions as option}
          <button class:selected={option.value === minWordLength} type="button" role="option" aria-selected={option.value === minWordLength} on:click={() => selectMinWordLength(option.value)}>
            <span>{option.label}</span>
            {#if option.value === minWordLength}<Check size={15} />{/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="tile-menu-wrap">
    <button
      class:open={openMenu === 'time'}
      class="board-tile choice-tile"
      type="button"
      aria-haspopup="listbox"
      aria-expanded={openMenu === 'time'}
      on:click={() => toggleMenu('time')}
    >
      <Clock3 size={22} />
      <span>Tempo</span>
      <strong>{timeOptions.find((option) => option.value === gameTime)?.label}</strong>
      <span class="tile-chevron"><ChevronDown size={16} /></span>
    </button>

    {#if openMenu === 'time'}
      <div class="tile-menu" role="listbox" aria-label="Durata partita">
        {#each timeOptions as option}
          <button class:selected={option.value === gameTime} type="button" role="option" aria-selected={option.value === gameTime} on:click={() => selectGameTime(option.value)}>
            <span>{option.label}</span>
            {#if option.value === gameTime}<Check size={15} />{/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <button class="board-tile mode-tile" type="button" on:click={toggleManualMode}>
    <HelpCircle size={22} />
    <span>Lettere</span>
    <strong>{manualMode ? 'Manuale' : 'Random'}</strong>
  </button>

  <button
    class="board-tile action-tile"
    class:soft-disabled={!manualMode}
    type="button"
    aria-disabled={!manualMode}
    on:click={openManualEditor}
  >
    <Edit3 size={23} />
    <span>Configura</span>
  </button>

  <div class="tile-menu-wrap">
    <button
      class:open={openMenu === 'quantity'}
      class="board-tile choice-tile quantity-tile"
      class:soft-disabled={manualMode}
      type="button"
      aria-haspopup="listbox"
      aria-expanded={openMenu === 'quantity'}
      aria-disabled={manualMode}
      on:click={openQuantityMenu}
    >
      <Grid3X3 size={23} />
      <span>Densità</span>
      <strong>{wordQuantityOptions.find((option) => option.value === wordQuantityMode)?.label}</strong>
      <small>{quantityDetailLabel}</small>
      <span class="tile-chevron"><ChevronDown size={16} /></span>
    </button>

    {#if openMenu === 'quantity'}
      <div class="tile-menu" role="listbox" aria-label="Quantita parole">
        {#each wordQuantityOptions as option}
          <button class:selected={option.value === wordQuantityMode} type="button" role="option" aria-selected={option.value === wordQuantityMode} on:click={() => selectWordQuantity(option.value)}>
            <span>{option.label}</span>
            {#if option.value === wordQuantityMode}<Check size={15} />{/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <button class="board-tile action-tile" type="button" on:click={() => (importOpen = true)}>
    <Download size={23} />
    <span>Importa</span>
  </button>

  

  <button class="board-tile action-tile" type="button" on:click={openInfo}>
    <BookOpen size={23} />
    <span>Info</span>
  </button>

  <button class="board-tile action-tile" type="button" on:click={openSettings}>
    <Settings size={23} />
    <span>Opzioni</span>
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

<Modal open={disabledInfoOpen} title={disabledInfoTitle} onClose={() => (disabledInfoOpen = false)}>
  <div class="disabled-info">
    <p>{disabledInfoMessage}</p>
    <button class="button primary" type="button" on:click={() => (disabledInfoOpen = false)}>Ok</button>
  </div>
</Modal>

<style>
  .home-board {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(3, minmax(0, 1fr));
    gap: var(--board-gap);
  }

  .tile-menu-wrap {
    min-width: 0;
    min-height: 0;
    position: relative;
  }

  .board-tile {
    width: 100%;
    height: 100%;
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
    font: inherit;
    text-align: center;
    transition:
      transform 80ms ease,
      border-color 120ms ease,
      background 120ms ease;
  }

  button.board-tile {
    cursor: pointer;
  }

  button.board-tile:hover:not(:disabled),
  button.board-tile.open {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--accent) 48%, var(--tile-border));
    background: color-mix(in srgb, var(--accent) 8%, var(--tile));
  }

  button.board-tile:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  button.board-tile.soft-disabled {
    opacity: 0.48;
  }

  button.board-tile.soft-disabled:hover {
    border-color: var(--tile-border);
    background: var(--tile);
  }

  .board-tile span {
    min-width: 0;
    overflow-wrap: anywhere;
    font-size: clamp(0.76rem, 2.6vw, 1.04rem);
    font-weight: 850;
    line-height: 1;
  }

  .board-tile strong {
    min-width: 0;
    max-width: 100%;
    color: var(--accent-strong);
    font-size: clamp(1rem, 4vw, 1.58rem);
    font-weight: 900;
    line-height: 0.95;
    overflow-wrap: anywhere;
  }

  .board-tile small {
    min-height: 1em;
    color: var(--muted);
    font-size: clamp(0.62rem, 2vw, 0.76rem);
    font-weight: 750;
    line-height: 1.1;
  }

  .choice-tile {
    position: relative;
  }

  .tile-chevron {
    position: absolute;
    right: 0.46rem;
    bottom: 0.46rem;
    display: inline-flex;
    color: var(--muted);
    font-size: 1rem;
    transition: transform 120ms ease;
  }

  .choice-tile.open .tile-chevron {
    transform: rotate(180deg);
  }

  .tile-menu {
    position: absolute;
    z-index: 80;
    top: calc(100% + var(--board-gap));
    left: 0;
    right: 0;
    display: grid;
    gap: 0.18rem;
    max-height: min(16rem, 44vh);
    overflow: auto;
    padding: 0.28rem;
    border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-lg);
  }

  .tile-menu button {
    min-width: 0;
    min-height: 2.45rem;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 1rem;
    align-items: center;
    gap: 0.35rem;
    padding: 0 0.62rem;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: clamp(0.78rem, 2vw, 0.94rem);
    font-weight: 800;
    text-align: left;
    cursor: pointer;
  }

  .tile-menu button span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tile-menu button:hover,
  .tile-menu button:focus-visible {
    background: var(--surface-muted);
  }

  .tile-menu button.selected {
    color: var(--accent-strong);
    background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  }

  .mode-tile {
    border-color: color-mix(in srgb, var(--selected) 28%, var(--tile-border));
  }

  .quantity-tile {
    gap: 0.24rem;
  }

  .disabled-info {
    display: grid;
    justify-items: end;
    gap: 1rem;
  }

  .disabled-info p {
    margin: 0;
    color: var(--muted);
    font-size: 0.95rem;
    line-height: 1.45;
  }

  @media (max-width: 560px) {
    .tile-menu button {
      min-height: 2.65rem;
    }
  }
</style>
