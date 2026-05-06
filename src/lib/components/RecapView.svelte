<script lang="ts">
  import { Home, RotateCcw } from 'lucide-svelte';
  import type { GameConfig, WordItem } from '../types';
  import { formatDuration, parseGridSize } from '../services/gameConfig';
  import BoardPreview from './BoardPreview.svelte';
  import WordList from './WordList.svelte';

  export let foundWordsList: WordItem[] = [];
  export let allSolutionsList: WordItem[] = [];
  export let board: string[][] = [];
  export let gameConfig: GameConfig;
  export let onRestart: () => void = () => {};
  export let onHome: () => void = () => {};
  export let onWordSelect: (word: string) => void = () => {};

  $: gridSize = parseGridSize(gameConfig.grid_size);
  $: totalScore = foundWordsList.reduce((sum, item) => sum + item.score, 0);
  $: totalPossibleScore = allSolutionsList.reduce((sum, item) => sum + item.score, 0);
  $: foundWords = new Set(foundWordsList.map((item) => item.word));
  $: solutionItems = allSolutionsList.map((item) => {
    const found = foundWords.has(item.word);
    return {
      ...item,
      found,
      displayScore: found ? `+${item.score}` : String(item.score),
    };
  });
  $: wordPercent = allSolutionsList.length > 0 ? Math.round((foundWordsList.length / allSolutionsList.length) * 100) : 0;
  $: scorePercent = totalPossibleScore > 0 ? Math.round((totalScore / totalPossibleScore) * 100) : 0;
</script>

<section class="recap-view">
  <header class="recap-header">
    <h1>Riepilogo partita</h1>
  </header>

  <div class="summary-grid">
    <section class="metric">
      <span>Parole</span>
      <strong>{foundWordsList.length} <small>/ {allSolutionsList.length}</small></strong>
      <em>{wordPercent}%</em>
    </section>
    <section class="metric">
      <span>Punti</span>
      <strong>{totalScore} <small>/ {totalPossibleScore}</small></strong>
      <em>{scorePercent}%</em>
    </section>
  </div>

  <div class="recap-layout">
    <section class="config-panel">
      <div>
        <h2>Configurazione</h2>
        <dl>
          <div>
            <dt>Dimensione</dt>
            <dd>{gridSize}x{gridSize}</dd>
          </div>
          <div>
            <dt>Lunghezza min.</dt>
            <dd>{gameConfig.min_word_length}</dd>
          </div>
          <div>
            <dt>Tempo</dt>
            <dd>{formatDuration(gameConfig.duration_sec)}</dd>
          </div>
        </dl>
      </div>
      <BoardPreview {board} {gridSize} size="compact" />
    </section>

    <WordList
      title="Tutte le soluzioni"
      words={solutionItems}
      showFoundState
      onWordSelect={onWordSelect}
    />
  </div>

  <footer class="recap-actions">
    <button class="button secondary" type="button" on:click={onHome}>
      <Home size={18} />
      Home
    </button>
    <button class="button primary" type="button" on:click={onRestart}>
      <RotateCcw size={18} />
      Rigioca
    </button>
  </footer>
</section>

<style>
  .recap-view {
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    gap: 0.85rem;
  }

  h1,
  h2 {
    margin: 0;
  }

  h1 {
    font-size: 1.45rem;
  }

  h2 {
    font-size: 1rem;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .metric,
  .config-panel {
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-sm);
  }

  .metric {
    display: grid;
    gap: 0.25rem;
    justify-items: center;
    padding: 0.9rem;
  }

  .metric span,
  dt {
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 750;
  }

  .metric strong {
    font-size: 1.55rem;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .metric small {
    color: var(--muted);
    font-size: 0.95rem;
  }

  .metric em {
    color: var(--accent-strong);
    font-style: normal;
    font-size: 0.9rem;
    font-weight: 800;
  }

  .recap-layout {
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(16rem, 0.36fr) minmax(0, 1fr);
    gap: 0.85rem;
  }

  .config-panel {
    align-self: start;
    display: grid;
    justify-items: center;
    gap: 1rem;
    padding: 1rem;
  }

  dl {
    margin: 0.75rem 0 0;
    display: grid;
    gap: 0.55rem;
  }

  dl div {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  dd {
    margin: 0;
    font-weight: 800;
  }

  .recap-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.7rem;
  }

  @media (max-width: 780px) {
    .recap-layout {
      grid-template-columns: 1fr;
    }

    .config-panel {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      justify-items: stretch;
    }
  }

  @media (max-width: 520px) {
    .summary-grid {
      gap: 0.55rem;
    }

    .metric strong {
      font-size: 1.2rem;
    }

    .config-panel {
      grid-template-columns: 1fr;
      justify-items: center;
    }

    .recap-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
