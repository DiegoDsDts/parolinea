<script lang="ts">
  import { Download, Edit3, Play, Shuffle } from 'lucide-svelte';
  import type { DictionaryStatus, GameConfig } from '../types';
  import { createManualGameConfig, generateGameConfig } from '../services/gameConfig';
  import { createEmptyBoard } from '../services/letters';
  import BoardPreview from './BoardPreview.svelte';
  import CustomSelect from './CustomSelect.svelte';
  import ImportGameModal from './ImportGameModal.svelte';
  import ManualBoardEditor from './ManualBoardEditor.svelte';

  export let dictionaryStatus: DictionaryStatus;
  export let onStart: (config: GameConfig) => void = () => {};

  const gridOptions = [3, 4, 5, 6, 7, 8];
  const minWordLengthOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const timeOptions = [
    { label: 'Illimitato', value: 0 },
    { label: '15 sec', value: 15 },
    { label: '30 sec', value: 30 },
    { label: '1 min', value: 60 },
    { label: '2 min', value: 120 },
    { label: '3 min', value: 180 },
    { label: '5 min', value: 300 },
    { label: '10 min', value: 600 },
    { label: '30 min', value: 1800 },
    { label: '60 min', value: 3600 },
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

  $: sampleConfig = generateGameConfig(gridSize, minWordLength, gameTime);
  $: gridSelectOptions = gridOptions.map((option) => ({
    label: `${option}x${option}`,
    value: option,
  }));
  $: minWordLengthSelectOptions = minWordLengthOptions.map((option) => ({
    label: String(option),
    value: option,
  }));

  function startGame() {
    validationError = '';

    if (manualMode) {
      const hasMissingCells = manualBoard.some((row) => row.some((cell) => !cell));
      if (hasMissingCells) {
        validationError = 'Completa tutte le caselle della griglia manuale.';
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

<section class="setup-view">
  <div class="setup-header">
    <div>
      <p class="eyebrow">Parolinea</p>
      <h1>Prepara la partita</h1>
    </div>
    <div class="dictionary-pill" class:ready={dictionaryStatus.ready}>
      {dictionaryStatus.ready ? `${dictionaryStatus.wordsLoaded.toLocaleString('it-IT')} parole` : 'Dizionario'}
    </div>
  </div>

  <div class="setup-grid">
    <section class="setup-panel">
      <h2>Regole</h2>
      <div class="field-grid">
        <div class="field">
          <span>Dimensione</span>
          <CustomSelect bind:value={gridSize} options={gridSelectOptions} ariaLabel="Dimensione griglia" />
        </div>

        <div class="field">
          <span>Lunghezza minima</span>
          <CustomSelect bind:value={minWordLength} options={minWordLengthSelectOptions} ariaLabel="Lunghezza minima" />
        </div>

        <div class="field">
          <span>Durata</span>
          <CustomSelect bind:value={gameTime} options={timeOptions} ariaLabel="Durata partita" />
        </div>
      </div>
    </section>

    <section class="setup-panel">
      <div class="panel-title-row">
        <h2>Griglia</h2>
        <div class="segmented" aria-label="Modalita griglia">
          <button class:active={!manualMode} type="button" on:click={() => (manualMode = false)}>
            <Shuffle size={16} />
            Casuale
          </button>
          <button class:active={manualMode} type="button" on:click={() => (manualMode = true)}>
            <Edit3 size={16} />
            Manuale
          </button>
        </div>
      </div>

      {#if manualMode}
        <div class="manual-row">
          <BoardPreview board={manualBoard} {gridSize} />
          <button class="button secondary" type="button" on:click={() => (manualEditorOpen = true)}>
            <Edit3 size={18} />
            Modifica
          </button>
        </div>
      {:else}
        <div class="random-preview">
          <BoardPreview board={sampleConfig.board_letters} {gridSize} />
        </div>
      {/if}
    </section>
  </div>

  {#if validationError}
    <p class="form-error">{validationError}</p>
  {/if}

  <div class="setup-actions">
    <button class="button secondary" type="button" on:click={() => (importOpen = true)}>
      <Download size={18} />
      Importa
    </button>
    <button class="button primary" type="button" on:click={startGame} disabled={!dictionaryStatus.ready}>
      <Play size={18} />
      Inizia partita
    </button>
  </div>
</section>

<ManualBoardEditor
  open={manualEditorOpen}
  {gridSize}
  boardLetters={manualBoard}
  onClose={() => (manualEditorOpen = false)}
  onSave={saveManualBoard}
/>

<ImportGameModal open={importOpen} onClose={() => (importOpen = false)} onImport={importGame} />

<style>
  .setup-view {
    width: min(100%, 56rem);
    margin-inline: auto;
    display: grid;
    gap: 1rem;
  }

  .setup-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .eyebrow {
    margin: 0 0 0.2rem;
    color: var(--accent-strong);
    font-size: 0.88rem;
    font-weight: 850;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h1,
  h2 {
    margin: 0;
  }

  h1 {
    font-size: 1.8rem;
    line-height: 1.1;
  }

  h2 {
    font-size: 1rem;
  }

  .dictionary-pill {
    flex: 0 0 auto;
    padding: 0.45rem 0.65rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--muted);
    background: var(--surface);
    font-size: 0.82rem;
    font-weight: 800;
  }

  .dictionary-pill.ready {
    color: var(--success);
    border-color: color-mix(in srgb, var(--success) 45%, var(--border));
  }

  .setup-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.8fr);
    gap: 1rem;
  }

  .setup-panel {
    min-width: 0;
    display: grid;
    gap: 0.9rem;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-sm);
  }

  .field-grid {
    display: grid;
    gap: 0.8rem;
  }

  .field {
    display: grid;
    gap: 0.35rem;
    color: var(--muted);
    font-size: 0.85rem;
    font-weight: 700;
  }

  .panel-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.7rem;
  }

  .segmented {
    display: inline-flex;
    padding: 0.18rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface-muted);
  }

  .segmented button {
    min-height: 2rem;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0 0.6rem;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: 0.82rem;
    font-weight: 800;
    cursor: pointer;
  }

  .segmented button.active {
    background: var(--accent);
    color: white;
  }

  .manual-row,
  .random-preview {
    display: grid;
    justify-items: center;
    gap: 0.8rem;
  }

  .setup-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.7rem;
    flex-wrap: wrap;
  }

  @media (max-width: 780px) {
    .setup-grid {
      grid-template-columns: 1fr;
    }

    .setup-header {
      align-items: stretch;
      flex-direction: column;
    }

    .dictionary-pill {
      width: fit-content;
    }
  }

  @media (max-width: 520px) {
    .setup-actions {
      display: grid;
      grid-template-columns: 1fr;
    }

    .button {
      width: 100%;
    }

    .panel-title-row {
      align-items: stretch;
      flex-direction: column;
    }

    .segmented {
      width: 100%;
    }

    .segmented button {
      flex: 1;
      justify-content: center;
    }
  }
</style>
