<script lang="ts">
  import { flip } from 'svelte/animate';
  import type { BoardCell, FeedbackType } from '../types';

  type TileFadeType = FeedbackType | 'neutral' | 'discovery-dead' | 'discovery-exhausted' | 'discovery-valid';

  export let boardCells: BoardCell[][] = [];
  export let selectedIndices: number[] = [];
  export let fadingIndices: number[] = [];
  export let fadingType: TileFadeType = null;
  export let feedbackType: FeedbackType = null;
  export let discoveryPathFeedback: 'dead' | 'exhausted' | 'valid' | null = null;
  export let gridSize = 4;
  export let isPaused = false;
  export let disabled = false;
  export let onDiceSelectStart: (index: number) => void = () => {};
  export let onDiceSelectMove: (index: number) => void = () => {};
  export let onDiceSelectEnd: () => void = () => {};
  export let onDiceTap: (index: number) => boolean = () => false;

  const DRAG_CORNER_DEAD_ZONE_RATIO = 0.28;
  const DRAG_EDGE_DEAD_ZONE_RATIO = 0.08;
  const TAP_MOVE_TOLERANCE_PX = 8;
  const TILE_LETTER_SIZE_RATIO = 0.50;

  let dragging = false;
  let pointerStartIndex: number | null = null;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerMoved = false;
  let tileFont = '1rem';

  $: selectedSet = new Set(selectedIndices);
  $: fadingSet = new Set(fadingIndices);
  $: cells = boardCells.flat();

  function measureTileFont(node: HTMLElement, _layoutKey: string) {
    let frame = 0;

    const updateTileFont = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const tile = node.querySelector<HTMLElement>('[data-cell-index]');
        if (!tile) return;

        const rect = tile.getBoundingClientRect();
        const tileSize = Math.min(rect.width, rect.height);
        if (tileSize > 0) tileFont = `${tileSize * TILE_LETTER_SIZE_RATIO}px`;
      });
    };

    const observer = new ResizeObserver(updateTileFont);
    observer.observe(node);
    updateTileFont();

    return {
      update(_nextLayoutKey: string) {
        updateTileFont();
      },
      destroy() {
        cancelAnimationFrame(frame);
        observer.disconnect();
      },
    };
  }

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

  function isInDragEdgeDeadZone(tile: HTMLElement, event: PointerEvent): boolean {
    const rect = tile.getBoundingClientRect();
    const deadZoneSize = Math.min(rect.width, rect.height) * DRAG_EDGE_DEAD_ZONE_RATIO;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return (
      x <= deadZoneSize ||
      x >= rect.width - deadZoneSize ||
      y <= deadZoneSize ||
      y >= rect.height - deadZoneSize
    );
  }

  function isInDragDeadZone(tile: HTMLElement, event: PointerEvent): boolean {
    return isInDragCornerDeadZone(tile, event) || isInDragEdgeDeadZone(tile, event);
  }

  function isOrthogonallyAdjacentToLastSelected(index: number): boolean {
    const lastIndex = selectedIndices[selectedIndices.length - 1];
    if (lastIndex === undefined) return false;

    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const lastRow = Math.floor(lastIndex / gridSize);
    const lastCol = lastIndex % gridSize;
    const rowDistance = Math.abs(row - lastRow);
    const colDistance = Math.abs(col - lastCol);

    return rowDistance + colDistance === 1;
  }

  function indexFromPoint(event: PointerEvent): number | null {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!(element instanceof Element)) return null;
    const tile = element.closest<HTMLElement>('[data-cell-index]');
    if (!tile) return null;
    const index = indexFromTarget(tile);
    if (index === null) return null;
    if (isOrthogonallyAdjacentToLastSelected(index) && isInDragDeadZone(tile, event)) {
      return null;
    }

    return index;
  }

  function handlePointerDown(event: PointerEvent) {
    if (isPaused || disabled) return;
    const index = indexFromTarget(event.target);
    if (index === null) return;

    dragging = true;
    pointerStartIndex = index;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    pointerMoved = false;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    onDiceSelectStart(index);
    event.preventDefault();
  }

  function handlePointerMove(event: PointerEvent) {
    if (!dragging || isPaused || disabled) return;
    if (
      Math.abs(event.clientX - pointerStartX) > TAP_MOVE_TOLERANCE_PX ||
      Math.abs(event.clientY - pointerStartY) > TAP_MOVE_TOLERANCE_PX
    ) {
      pointerMoved = true;
    }

    const index = indexFromPoint(event);
    if (index !== null) onDiceSelectMove(index);
    event.preventDefault();
  }

  function handlePointerEnd(event: PointerEvent) {
    if (!dragging) return;
    const tapIndex = !pointerMoved ? pointerStartIndex : null;

    dragging = false;
    pointerStartIndex = null;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    if (tapIndex !== null && onDiceTap(tapIndex)) {
      event.preventDefault();
      return;
    }

    onDiceSelectEnd();
    event.preventDefault();
  }

  function handlePointerCancel(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    pointerStartIndex = null;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    onDiceSelectEnd();
    event.preventDefault();
  }
</script>

<div
  class="board"
  class:paused={isPaused}
  class:disabled
  style={`--grid-size: ${gridSize}; --tile-font: ${tileFont};`}
  use:measureTileFont={`${gridSize}:${boardCells.length}`}
  on:pointerdown={handlePointerDown}
  on:pointermove={handlePointerMove}
  on:pointerup={handlePointerEnd}
  on:pointercancel={handlePointerCancel}
  role="grid"
  aria-label="Griglia di gioco"
  aria-disabled={disabled}
  tabindex="0"
>
  <div class="tile-layer tile-backgrounds" aria-hidden="true">
    {#each cells as cell, index (cell.id)}
      {@const selected = selectedSet.has(index)}
      <div
        animate:flip={{ duration: 850 }}
        class:selected
        class:discovery-dead={selected && discoveryPathFeedback === 'dead' && !feedbackType}
        class:discovery-exhausted={selected && discoveryPathFeedback === 'exhausted' && !feedbackType}
        class:discovery-valid={selected && discoveryPathFeedback === 'valid' && !feedbackType}
        class:valid={selected && feedbackType === 'word-valid'}
        class:duplicate={selected && feedbackType === 'word-duplicate'}
        class:invalid={selected && feedbackType === 'word-invalid'}
        class="tile-bg"
      ></div>
    {/each}
  </div>

  <div class="tile-layer tile-fades" aria-hidden="true">
    {#each cells as cell, index (cell.id)}
      {@const fading = fadingSet.has(index)}
      <div
        class:visible={fading}
        class:neutral={fading && fadingType === 'neutral'}
        class:valid={fading && fadingType === 'word-valid'}
        class:duplicate={fading && fadingType === 'word-duplicate'}
        class:invalid={fading && fadingType === 'word-invalid'}
        class:discovery-dead={fading && fadingType === 'discovery-dead'}
        class:discovery-exhausted={fading && fadingType === 'discovery-exhausted'}
        class:discovery-valid={fading && fadingType === 'discovery-valid'}
        class="tile-fade"
      >
        {#if fading}
          <span class="tile-fade-letter">{cell.letter}</span>
        {/if}
      </div>
    {/each}
  </div>

  <div class="tile-layer tile-controls">
    {#each cells as cell, index (cell.id)}
      {@const selected = selectedSet.has(index)}
      <button
        animate:flip={{ duration: 850 }}
        class:selected
        class="tile"
        type="button"
        data-cell-index={index}
        tabindex="-1"
        aria-label={`Lettera ${cell.letter}`}
      >
        <span class="tile-letter">{isPaused ? '' : cell.letter}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .board {
    width: min(100%, 38rem);
    aspect-ratio: 1;
    position: relative;
    padding: 1px;
    background: var(--tile-border);
    touch-action: none;
    user-select: none;
  }

  .tile-layer {
    position: absolute;
    inset: 1px;
    display: grid;
    grid-template-columns: repeat(var(--grid-size), minmax(0, 1fr));
    gap: 1px;
  }

  .tile-backgrounds {
    z-index: 1;
    pointer-events: none;
  }

  .tile-controls {
    z-index: 2;
  }

  .tile-fades {
    z-index: 3;
    pointer-events: none;
  }

  .tile-bg,
  .tile,
  .tile-fade {
    width: 100%;
    min-width: 0;
    aspect-ratio: 1;
    border: 0;
    border-radius: 0;
  }

  .tile-bg {
    --tile-bg: var(--tile);
    background: var(--tile-bg);
  }

  .tile-fade {
    display: grid;
    place-items: center;
    background: transparent;
    opacity: 0;
    font-size: var(--tile-font);
    font-weight: 850;
    line-height: 1;
    text-transform: uppercase;
  }

  .tile-fade.visible {
    animation: tile-selection-fade 170ms ease-out forwards;
  }

  .tile-fade.neutral {
    background: var(--selected);
  }

  .tile-fade.valid {
    background: var(--success);
  }

  .tile-fade.duplicate {
    background: var(--warning);
  }

  .tile-fade.invalid {
    background: var(--danger);
  }

  .tile-fade.discovery-dead {
    background: #5b0c08;
  }

  .tile-fade.discovery-exhausted {
    background: #8b6100;
  }

  .tile-fade.discovery-valid {
    background: #0f5a2e;
  }

  .tile-fade-letter {
    color: white;
  }

  .tile {
    display: grid;
    place-items: center;
    background: transparent;
    color: var(--ink);
    box-shadow: none;
    font-size: var(--tile-font);
    font-weight: 850;
    line-height: 1;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      color 80ms ease;
  }

  .tile-letter {
    position: relative;
  }

  .tile-bg.selected {
    --tile-bg: var(--selected);
  }

  .tile-bg.discovery-dead {
    --tile-bg: #5b0c08;
  }

  .tile-bg.discovery-exhausted {
    --tile-bg: #8b6100;
  }

  .tile-bg.discovery-valid {
    --tile-bg: #0f5a2e;
  }

  .tile-bg.valid {
    --tile-bg: var(--success);
  }

  .tile-bg.duplicate {
    --tile-bg: var(--warning);
  }

  .tile-bg.invalid {
    --tile-bg: var(--danger);
  }
  
  .tile-bg:hover {
    --tile-bg: color-mix(in srgb, var(--accent) 5%, var(--tile));
  }

  .tile.selected {
    color: white;
  }

  .board.paused .tile {
    cursor: default;
    opacity: 0.58;
  }

  .board.paused .tile-bg {
    opacity: 0.58;
  }

  .board.disabled .tile {
    cursor: default;
    color: color-mix(in srgb, var(--ink) 68%, var(--muted));
  }

  .board.disabled .tile-bg {
    --tile-bg: color-mix(in srgb, var(--tile) 76%, var(--ink));
  }

  .board.disabled .tile-controls {
    pointer-events: none;
  }

  @keyframes tile-selection-fade {
    from {
      opacity: 1;
    }

    to {
      opacity: 0;
    }
  }

  @media (max-width: 520px) {
    .tile-layer {
      gap: 1px;
    }
  }
</style>
