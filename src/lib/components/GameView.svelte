<script lang="ts">
  import { Home, Pause, Play, Square } from 'lucide-svelte';
  import type { FeedbackType, GameConfig, WordItem } from '../types';
  import { parseGridSize } from '../services/gameConfig';
  import CurrentWord from './CurrentWord.svelte';
  import GameBoard from './GameBoard.svelte';
  import GameTimer from './GameTimer.svelte';
  import WordList from './WordList.svelte';

  export let gameConfig: GameConfig;
  export let board: string[][] = [];
  export let selectedIndices: number[] = [];
  export let currentWord = '';
  export let feedbackType: FeedbackType = null;
  export let foundWordsList: WordItem[] = [];
  export let totalScore = 0;
  export let totalPossibleScore = 0;
  export let allSolutionsCount = 0;
  export let gameActive = false;
  export let isPaused = false;
  export let timerResetKey = 0;
  export let onDiceSelectStart: (index: number) => void = () => {};
  export let onDiceSelectMove: (index: number) => void = () => {};
  export let onDiceSelectEnd: () => void = () => {};
  export let onHome: () => void = () => {};
  export let onPauseToggle: () => void = () => {};
  export let onEndGame: (manual: boolean) => void = () => {};
  export let onWordSelect: (word: string) => void = () => {};

  $: gridSize = parseGridSize(gameConfig['grid-size']);
  $: boardCells = board.map((row, rowIndex) =>
    row.map((letter, colIndex) => ({
      id: `${rowIndex}-${colIndex}`,
      letter,
    })),
  );
</script>

<section class="play-view">
  <header class="play-header">
    <CurrentWord word={currentWord} {feedbackType} />
    <div class="score-timer">
      <strong>{totalScore} / {allSolutionsCount > 0 ? totalPossibleScore : '?'}</strong>
      <GameTimer
        seconds={gameConfig['duration-sec']}
        active={gameActive}
        paused={isPaused}
        resetKey={timerResetKey}
        onEnd={() => onEndGame(false)}
      />
    </div>
  </header>

  <div class="play-layout">
    <div class="board-shell">
      <GameBoard
        {boardCells}
        {selectedIndices}
        {feedbackType}
        {gridSize}
        {isPaused}
        {onDiceSelectStart}
        {onDiceSelectMove}
        {onDiceSelectEnd}
      />
    </div>

    <aside class="found-shell">
      <WordList
        title="Parole trovate"
        words={foundWordsList}
        emptyText="Nessuna parola trovata"
        onWordSelect={onWordSelect}
      />
    </aside>
  </div>

  <footer class="play-actions">
    <button class="button secondary" type="button" on:click={onHome}>
      <Home size={18} />
      Home
    </button>
    <button class="button secondary square" type="button" aria-label={isPaused ? 'Riprendi' : 'Pausa'} on:click={onPauseToggle}>
      {#if isPaused}
        <Play size={19} />
      {:else}
        <Pause size={19} />
      {/if}
    </button>
    <button class="button danger" type="button" on:click={() => onEndGame(true)}>
      <Square size={16} />
      Termina
    </button>
  </footer>
</section>

<style>
  .play-view {
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 0.75rem;
  }

  .play-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.8rem;
  }

  .score-timer {
    display: grid;
    justify-items: end;
    gap: 0.35rem;
  }

  .score-timer strong {
    font-size: 1rem;
    font-variant-numeric: tabular-nums;
  }

  .play-layout {
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.42fr);
    gap: 1rem;
  }

  .board-shell {
    min-height: 0;
    display: grid;
    place-items: center;
  }

  .found-shell {
    min-height: 0;
  }

  .play-actions {
    display: flex;
    justify-content: center;
    gap: 0.6rem;
    padding-block: 0.25rem;
  }

  .square {
    width: 3rem;
    padding-inline: 0;
  }

  @media (max-width: 860px) {
    .play-layout {
      grid-template-columns: 1fr;
      grid-template-rows: auto minmax(10rem, 1fr);
    }
  }

  @media (max-width: 520px) {
    .play-view {
      gap: 0.55rem;
    }

    .play-header {
      gap: 0.5rem;
    }

    .score-timer strong {
      font-size: 0.9rem;
    }

    .play-actions {
      display: grid;
      grid-template-columns: 1fr 3rem 1fr;
    }
  }
</style>
