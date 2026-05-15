<script lang="ts">
  import { onMount } from 'svelte';
  import {
    BookOpen,
    Check,
    ChevronDown,
    Clock3,
    Compass,
    Download,
    Edit3,
    Grid3X3,
    Settings,
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

  type TileMenu = 'grid' | 'min' | 'time' | 'letters' | 'quantity';
  type TileOption<T extends string | number> = {
    label: string;
    value: T;
  };
  type HomeSettings = {
    gridSize: number;
    gameTime: number;
    minWordLength: number;
    wordQuantityMode: WordQuantityMode;
    discoveryMode: boolean;
    discoveryTargetPercent: number;
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
  const discoveryTargetOptions = [50, 60, 70, 90, 100];

  let gridSize = 5;
  let gameTime = 0;
  let minWordLength = 5;
  let wordQuantityMode: WordQuantityMode = 'random';
  let discoveryMode = false;
  let discoveryTargetPercent = 70;
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
  let discoveryInfoOpen = false;

  $: if (manualBoard.length !== gridSize || manualBoard[0]?.length !== gridSize) {
    manualBoard = createEmptyBoard(gridSize);
  }

  $: gridSelectOptions = gridOptions.map((option) => ({
    label: `${option}x${option}`,
    value: option,
  }));
  $: minWordLengthSelectOptions = minWordLengthOptions.map((option) => ({
    label: `${option}+`,
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

  function isDiscoveryTargetPercent(value: unknown): value is number {
    return typeof value === 'number' && discoveryTargetOptions.includes(value);
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

      if (typeof settings.discoveryMode === 'boolean') {
        discoveryMode = settings.discoveryMode;
      }

      if (isDiscoveryTargetPercent(settings.discoveryTargetPercent)) {
        discoveryTargetPercent = settings.discoveryTargetPercent;
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
      discoveryMode,
      discoveryTargetPercent,
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

  function selectLettersMode(value: boolean) {
    manualMode = value;
    saveHomeSettings();
    closeMenu();
  }

  function toggleDiscoveryMode() {
    discoveryMode = !discoveryMode;
    if (discoveryMode && openMenu === 'time') openMenu = null;
    saveHomeSettings();
  }

  function openTimeSettings() {
    saveHomeSettings();

    if (discoveryMode) {
      openMenu = null;
      discoveryInfoOpen = true;
      return;
    }

    toggleMenu('time');
  }

  function selectDiscoveryTargetPercent(value: number) {
    discoveryTargetPercent = value;
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
    openMenu = null;

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

    const effectiveGameTime = discoveryMode ? 0 : gameTime;
    const config = manualMode
      ? createManualGameConfig(gridSize, minWordLength, effectiveGameTime, manualBoard)
      : generateGameConfig(gridSize, minWordLength, effectiveGameTime);

    onStart(config, {
      wordQuantityMode: manualMode ? 'random' : wordQuantityMode,
      discoveryMode,
      discoveryTargetPercent,
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
  {#if openMenu}
    <button class="menu-blur-backdrop" type="button" aria-label="Chiudi menu" on:click={closeMenu}></button>
  {/if}

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
      <svg class="length-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 7h5" />
        <path d="M5 12h9" />
        <path d="M5 17h14" />
      </svg>
      <span>Lunghezza</span>
      <strong>{minWordLength}+</strong>
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
      aria-haspopup={discoveryMode ? undefined : 'listbox'}
      aria-expanded={openMenu === 'time'}
      on:click={openTimeSettings}
    >
      <Clock3 size={22} />
      <span>Tempo</span>
      <strong>{discoveryMode ? 'Crono' : timeOptions.find((option) => option.value === gameTime)?.label}</strong>
      {#if discoveryMode}
        <small>{discoveryTargetPercent}% punti</small>
      {:else}
        <span class="tile-chevron"><ChevronDown size={16} /></span>
      {/if}
    </button>

    {#if openMenu === 'time' && !discoveryMode}
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

  <div class="tile-menu-wrap">
    <button
      class:open={openMenu === 'letters'}
      class="board-tile choice-tile mode-tile"
      type="button"
      aria-haspopup="listbox"
      aria-expanded={openMenu === 'letters'}
      on:click={() => toggleMenu('letters')}
    >
      <svg class="letters-mode-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4.25" y="4.25" width="15.5" height="15.5" />
        <path d="M9.45 9.35a2.75 2.75 0 0 1 5.1 1.45c0 1.8-2.55 2.1-2.55 3.55" />
        <circle cx="12" cy="17" r="0.55" fill="currentColor" stroke="none" />
      </svg>
      <span>Lettere</span>
      <strong>{manualMode ? 'Manuale' : 'Random'}</strong>
      <span class="tile-chevron"><ChevronDown size={16} /></span>
    </button>

    {#if openMenu === 'letters'}
      <div class="tile-menu" role="listbox" aria-label="Modalita lettere">
        <button class:selected={!manualMode} type="button" role="option" aria-selected={!manualMode} on:click={() => selectLettersMode(false)}>
          <span>Random</span>
          {#if !manualMode}<Check size={15} />{/if}
        </button>
        <button class:selected={manualMode} type="button" role="option" aria-selected={manualMode} on:click={() => selectLettersMode(true)}>
          <span>Manuale</span>
          {#if manualMode}<Check size={15} />{/if}
        </button>
        <button class="menu-action" type="button" disabled={!manualMode} on:click={openManualEditor}>
          <span>Configura</span>
          <Edit3 size={15} />
        </button>
      </div>
    {/if}
  </div>

  <button class="board-tile mode-tile discovery-tile" class:active={discoveryMode} type="button" on:click={toggleDiscoveryMode}>
    <Compass size={23} />
    <span>Modalità</span>
    <strong>{discoveryMode ? 'Scoperta' : 'Classica'}</strong>
    <small>{discoveryMode ? 'prefissi' : ''}</small>
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

<Modal open={discoveryInfoOpen} title="Tempo in Scoperta" onClose={() => (discoveryInfoOpen = false)}>
  <div class="discovery-info">
    <p>
      In modalità Scoperta non c'è un conto alla rovescia: devi raggiungere la soglia scelta dei punti disponibili
      nello schema nel minor tempo possibile. La partita finisce appena raggiungi l'obiettivo e il risultato
      è il tempo impiegato.
    </p>
    <div class="threshold-field" role="group" aria-label="Soglia obiettivo">
      <span>Soglia</span>
      <div class="threshold-options">
        {#each discoveryTargetOptions as option}
          <button
            class:selected={option === discoveryTargetPercent}
            type="button"
            aria-pressed={option === discoveryTargetPercent}
            on:click={() => selectDiscoveryTargetPercent(option)}
          >
            {option}%
          </button>
        {/each}
      </div>
    </div>
    <button class="button primary" type="button" on:click={() => (discoveryInfoOpen = false)}>Ok</button>
  </div>
</Modal>

<style>
  .home-board {
    width: 100%;
    height: 100%;
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(3, minmax(0, 1fr));
    gap: 1px;
    padding: 1px;
    background: var(--tile-border);
  }

  .menu-blur-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    border: 0;
    background: rgb(247 245 239 / 0.18);
    backdrop-filter: blur(4px);
    cursor: default;
    animation: blur-enter 26ms ease-out;
  }

  .tile-menu-wrap {
    min-width: 0;
    min-height: 0;
    position: relative;
  }

  .tile-menu-wrap:has(.board-tile.open) {
    z-index: 90;
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
    border: 0;
    border-radius: 0;
    background: var(--tile);
    color: var(--ink);
    box-shadow: none;
    font: inherit;
    text-align: center;
    transition:
      background 120ms ease;
  }

  button.board-tile {
    cursor: pointer;
  }

  button.board-tile:hover:not(:disabled),
  button.board-tile.open {
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

  .letters-mode-icon,
  .length-icon {
    width: 1.55rem;
    height: 1.55rem;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: square;
    stroke-linejoin: miter;
  }

  .length-icon {
    stroke-width: 2.25;
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
    z-index: 91;
    top: calc(100% + 1px);
    left: 0;
    right: 0;
    display: grid;
    gap: 0.18rem;
    max-height: min(16rem, 44vh);
    overflow: auto;
    padding: 0.28rem;
    border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
    border-radius: 0;
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
    border-radius: 0;
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

  .tile-menu button.menu-action {
    color: var(--ink);
  }

  .tile-menu button:disabled {
    cursor: not-allowed;
    color: color-mix(in srgb, var(--muted) 62%, var(--surface));
  }

  .tile-menu button:disabled:hover,
  .tile-menu button:disabled:focus-visible {
    background: transparent;
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

  .discovery-info {
    display: grid;
    gap: 1rem;
  }

  .discovery-info p {
    margin: 0;
    color: var(--muted);
    font-size: 0.95rem;
    line-height: 1.45;
  }

  .discovery-info > .button {
    justify-self: end;
  }

  .threshold-field {
    display: grid;
    gap: 0.45rem;
  }

  .threshold-field > span {
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 850;
    text-transform: uppercase;
  }

  .threshold-options {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 1px;
    background: var(--tile-border);
    padding: 1px;
  }

  .threshold-options button {
    min-width: 0;
    min-height: 2.5rem;
    border: 0;
    border-radius: 0;
    background: var(--tile);
    color: var(--ink);
    font: inherit;
    font-weight: 850;
    cursor: pointer;
  }

  .threshold-options button.selected {
    background: var(--accent);
    color: white;
  }

  @keyframes blur-enter {
    from {
      opacity: 0;
      backdrop-filter: blur(0);
    }

    to {
      opacity: 1;
      backdrop-filter: blur(4px);
    }
  }

  @media (max-width: 560px) {
    .tile-menu button {
      min-height: 2.65rem;
    }
  }
</style>
