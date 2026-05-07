<script lang="ts">
  import { CheckCircle2, Clock3, Grid3X3, Link2, ListChecks, MousePointer2, RotateCcw, Trophy, Type } from 'lucide-svelte';

  const cells = [
    { title: 'Collega', text: 'Trascina tra lettere vicine', Icon: Link2 },
    { title: 'Direzioni', text: 'Orizzontale, verticale, diagonale', Icon: Grid3X3 },
    { title: 'Unica volta', text: 'Ogni dado vale una volta', Icon: RotateCcw },
    { title: 'Minima', text: 'Rispetta la lunghezza scelta', Icon: Type },
    { title: 'Punti', text: 'Parole lunghe valgono di piu', Icon: Trophy },
    { title: 'Tempo', text: 'Finisce allo scadere', Icon: Clock3 },
    { title: 'Drag', text: 'Gli angoli aiutano le diagonali', Icon: MousePointer2 },
    { title: 'Valide', text: 'Contano solo parole italiane', Icon: CheckCircle2 },
    { title: 'Scala', text: '2:2  3:5  4:9  5:14  6:20', Icon: ListChecks },
  ];
</script>

<div class="info-board" aria-label="Regole del gioco">
  {#each cells as cell}
    <section class="info-tile">
      <svelte:component this={cell.Icon} size={23} />
      <h2>{cell.title}</h2>
      <p>{cell.text}</p>
    </section>
  {/each}
</div>

<style>
  .info-board {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(3, minmax(0, 1fr));
    gap: var(--board-gap);
  }

  .info-tile {
    min-width: 0;
    min-height: 0;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 0.34rem;
    padding: clamp(0.42rem, 1.8vw, 0.72rem);
    border: 1px solid var(--tile-border);
    border-radius: 6px;
    background: var(--tile);
    color: var(--ink);
    box-shadow: var(--shadow-sm);
    text-align: center;
  }

  h2,
  p {
    margin: 0;
  }

  h2 {
    font-size: clamp(0.76rem, 2.5vw, 1.02rem);
    line-height: 1;
  }

  p {
    color: var(--muted);
    font-size: clamp(0.58rem, 1.8vw, 0.76rem);
    font-weight: 700;
    line-height: 1.16;
    overflow-wrap: anywhere;
  }
</style>
