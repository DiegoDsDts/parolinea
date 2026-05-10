<script lang="ts">
  import { ArrowLeft } from 'lucide-svelte';

  export let onBack: () => void = () => {};

  const scoreRows = [
    { length: '2', score: '2' },
    { length: '3', score: '5' },
    { length: '4', score: '9' },
    { length: '5', score: '14' },
    { length: '6', score: '20' },
    { length: '7', score: '27' },
    { length: '8', score: '35' },
    { length: '9', score: '44' },
    { length: '10', score: '54' },
    { length: '11', score: '65' },
    { length: '12+', score: '77' },
  ];
</script>

<div class="info-board" aria-label="Regole del gioco">
  <section class="info-tile score-tile">
    <h2>Valore parole</h2>
    <div class="score-table" aria-label="Punti per lunghezza parola">
      <span class="score-head">Lettere</span>
      <span class="score-head">Punti</span>
      {#each scoreRows as row}
        <span>{row.length}</span>
        <strong>{row.score}</strong>
      {/each}
    </div>
  </section>

  <button class="info-tile back-tile" type="button" on:click={onBack}>
    <ArrowLeft size={23} />
    <h2>Indietro</h2>
    <p>Home</p>
  </button>

  <div class="info-tile empty-tile empty-tile-a" aria-hidden="true"></div>
  <div class="info-tile empty-tile empty-tile-b" aria-hidden="true"></div>
</div>

<style>
  .info-board {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(3, minmax(0, 1fr));
    gap: 1px;
    padding: 1px;
    background: var(--tile-border);
  }

  .info-tile {
    min-width: 0;
    min-height: 0;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 0.34rem;
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

  .score-tile {
    grid-column: 1 / -1;
    grid-row: 1 / span 2;
    gap: clamp(0.42rem, 1.8vw, 0.8rem);
    padding: clamp(0.7rem, 2.4vw, 1rem);
  }

  button.info-tile {
    cursor: pointer;
  }

  button.info-tile:hover {
    background: color-mix(in srgb, var(--accent) 8%, var(--tile));
  }

  h2,
  p {
    margin: 0;
  }

  h2 {
    font-size: clamp(0.76rem, 2.5vw, 1.02rem);
    line-height: 1;
  }

  .score-tile h2 {
    font-size: clamp(1rem, 4.2vw, 1.45rem);
  }

  p {
    color: var(--muted);
    font-size: clamp(0.58rem, 1.8vw, 0.76rem);
    font-weight: 700;
    line-height: 1.16;
    overflow-wrap: anywhere;
  }

  .score-table {
    width: min(100%, 15rem);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.16rem 0.5rem;
    color: var(--muted);
    font-size: clamp(0.7rem, 2.45vw, 0.95rem);
    font-weight: 800;
    line-height: 1.05;
    font-variant-numeric: tabular-nums;
  }

  .score-table span,
  .score-table strong {
    min-width: 0;
    padding: 0.18rem 0.32rem;
    border-radius: 0;
    background: var(--surface-muted);
  }

  .score-table strong {
    color: var(--ink);
  }

  .score-head {
    color: var(--ink);
    background: transparent !important;
    font-size: clamp(0.6rem, 1.9vw, 0.78rem);
    text-transform: uppercase;
  }

  .back-tile {
    grid-column: 1;
    grid-row: 3;
  }

  .empty-tile {
    pointer-events: none;
    background: color-mix(in srgb, var(--tile) 68%, var(--surface-muted));
  }

  .empty-tile-a {
    grid-column: 2;
    grid-row: 3;
  }

  .empty-tile-b {
    grid-column: 3;
    grid-row: 3;
  }
</style>
