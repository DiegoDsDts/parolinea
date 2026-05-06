<script lang="ts">
  import type { FeedbackType } from '../types';

  export let board: string[][] = [];
  export let selectedIndices: number[] = [];
  export let feedbackType: FeedbackType = null;
  export let gridSize = 4;
  export let isPaused = false;
  export let onDiceSelectStart: (index: number) => void = () => {};
  export let onDiceSelectMove: (index: number) => void = () => {};
  export let onDiceSelectEnd: () => void = () => {};

  const DRAG_CORNER_DEAD_ZONE_RATIO = 0.34;

  let dragging = false;

  $: selectedSet = new Set(selectedIndices);
  $: tileFont = gridSize <= 4 ? '3.1rem' : gridSize <= 6 ? '2.55rem' : '2.1rem';

  function indexFromTarget(target: EventTarget | null): number | null {
    if (!(target instanceof Element)) return null;
    const tile = target.closest<HTMLElement>('[data-cell-index]');
    if (!tile) return null;
    const index = Number.parseInt(tile.dataset.cellIndex ?? '', 10);
    return Number.isInteger(index) ? index : null;
  }

  function isInDragCornerDeadZone(tile: HTMLElement, event: PointerEvent): boolean {
    const rect = tile.getBoundingClientRect();
    const deadZoneSize = Math.min(rect.width, rect.height) * DRAG_CORNER_DEAD_ZONE_RATIO;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const nearLeft = x <= deadZoneSize;
    const nearRight = x >= rect.width - deadZoneSize;
    const nearTop = y <= deadZoneSize;
    const nearBottom = y >= rect.height - deadZoneSize;

    return (nearLeft || nearRight) && (nearTop || nearBottom);
  }

  function indexFromPoint(event: PointerEvent, ignoreDragCorners = false): number | null {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!(element instanceof Element)) return null;
    const tile = element.closest<HTMLElement>('[data-cell-index]');
    if (!tile) return null;
    if (ignoreDragCorners && isInDragCornerDeadZone(tile, event)) return null;

    return indexFromTarget(tile);
  }

  function handlePointerDown(event: PointerEvent) {
    if (isPaused) return;
    const index = indexFromTarget(event.target);
    if (index === null) return;

    dragging = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    onDiceSelectStart(index);
    event.preventDefault();
  }

  function handlePointerMove(event: PointerEvent) {
    if (!dragging || isPaused) return;
    const index = indexFromPoint(event, true);
    if (index !== null) onDiceSelectMove(index);
    event.preventDefault();
  }

  function handlePointerEnd(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    onDiceSelectEnd();
    event.preventDefault();
  }
</script>

<div
  class="board"
  class:paused={isPaused}
  style={`--grid-size: ${gridSize}; --tile-font: ${tileFont};`}
  on:pointerdown={handlePointerDown}
  on:pointermove={handlePointerMove}
  on:pointerup={handlePointerEnd}
  on:pointercancel={handlePointerEnd}
  role="grid"
  aria-label="Griglia di gioco"
  tabindex="0"
>
  {#each board as row, rowIndex}
    {#each row as letter, colIndex}
      {@const index = rowIndex * gridSize + colIndex}
      {@const selected = selectedSet.has(index)}
      <button
        class:selected
        class:valid={selected && feedbackType === 'word-valid'}
        class:duplicate={selected && feedbackType === 'word-duplicate'}
        class:invalid={selected && feedbackType === 'word-invalid'}
        class="tile"
        type="button"
        data-cell-index={index}
        tabindex="-1"
        aria-label={`Lettera ${letter}`}
      >
        {isPaused ? '' : letter}
      </button>
    {/each}
  {/each}
</div>

<style>
  .board {
    width: min(100%, 38rem);
    aspect-ratio: 1;
    display: grid;
    grid-template-columns: repeat(var(--grid-size), minmax(0, 1fr));
    gap: 0.38rem;
    padding: 0.15rem;
    touch-action: none;
    user-select: none;
  }

  .tile {
    width: 100%;
    min-width: 0;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border: 1px solid var(--tile-border);
    border-radius: 6px;
    background: var(--tile);
    color: var(--ink);
    box-shadow: var(--shadow-sm);
    font-size: var(--tile-font);
    font-weight: 850;
    line-height: 1;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      transform 80ms ease,
      background 80ms ease,
      color 80ms ease,
      border-color 80ms ease;
  }

  .tile:hover {
    transform: translateY(-1px);
  }

  .tile.selected {
    border-color: var(--selected);
    background: var(--selected);
    color: white;
  }

  .tile.valid {
    border-color: var(--success);
    background: var(--success);
  }

  .tile.duplicate {
    border-color: var(--warning);
    background: var(--warning);
  }

  .tile.invalid {
    border-color: var(--danger);
    background: var(--danger);
  }

  .board.paused .tile {
    cursor: default;
    opacity: 0.58;
  }

  @media (max-width: 520px) {
    .board {
      gap: 0.28rem;
    }
  }
</style>
