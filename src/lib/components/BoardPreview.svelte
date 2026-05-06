<script lang="ts">
  export let board: string[][] = [];
  export let gridSize = 4;
  export let size: 'compact' | 'normal' = 'normal';

  $: tileFont = gridSize <= 4 ? '1.05rem' : gridSize <= 6 ? '0.86rem' : '0.72rem';
</script>

<div
  class:compact={size === 'compact'}
  class="board-preview"
  style={`--grid-size: ${gridSize}; --tile-font: ${tileFont};`}
  aria-label="Anteprima griglia"
>
  {#each board as row}
    {#each row as letter}
      <div class="preview-tile">{letter}</div>
    {/each}
  {/each}
</div>

<style>
  .board-preview {
    width: min(100%, 13rem);
    aspect-ratio: 1;
    display: grid;
    grid-template-columns: repeat(var(--grid-size), minmax(0, 1fr));
    gap: 0.22rem;
  }

  .board-preview.compact {
    width: min(100%, 9rem);
    gap: 0.16rem;
  }

  .preview-tile {
    display: grid;
    place-items: center;
    min-width: 0;
    aspect-ratio: 1;
    border: 1px solid var(--tile-border);
    border-radius: 5px;
    background: var(--tile);
    color: var(--ink);
    font-size: var(--tile-font);
    font-weight: 800;
    text-transform: uppercase;
  }
</style>
