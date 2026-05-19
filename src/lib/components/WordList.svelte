<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { WordItem } from '../types';

  export let words: WordItem[] = [];
  export let title = '';
  export let emptyText = 'Nessuna parola';
  export let showFoundState = false;
  export let showComparisonMarkers = false;
  export let opponentLabel = 'Avversario';
  export let onWordSelect: (word: string) => void = () => {};

  let wordsElement: HTMLDivElement;
  let canScrollRight = false;
  let updateQueued = false;

  $: opponentDisplayLabel = opponentLabel.trim() || 'Avversario';

  function updateScrollHint() {
    if (!wordsElement) {
      canScrollRight = false;
      return;
    }

    canScrollRight = wordsElement.scrollLeft + wordsElement.clientWidth < wordsElement.scrollWidth - 2;
  }

  function scheduleScrollHintUpdate() {
    if (updateQueued) return;
    updateQueued = true;

    tick().then(() => {
      updateQueued = false;
      updateScrollHint();
    });
  }

  $: {
    words;
    scheduleScrollHintUpdate();
  }

  function getComparisonLabel(item: WordItem): string {
    if (!showComparisonMarkers) return '';

    const labels: string[] = [];
    if (item.found) labels.push('trovata da te');
    if (item.opponentFound) labels.push(`trovata da ${opponentDisplayLabel}`);
    return labels.length > 0 ? labels.join(', ') : 'non trovata';
  }

  onMount(() => {
    updateScrollHint();
    window.addEventListener('resize', scheduleScrollHintUpdate);

    return () => {
      window.removeEventListener('resize', scheduleScrollHintUpdate);
    };
  });
</script>

<section class:can-scroll-right={canScrollRight} class="word-list" aria-label={title || 'Lista parole'}>
  {#if showComparisonMarkers}
    <header class="word-list-header">
      <h2>{title || 'Parole'}</h2>
      <div class="comparison-legend" aria-label="Legenda confronto parole">
        <span><i class="marker self active" aria-hidden="true"></i>Tu</span>
        <span><i class="marker opponent active" aria-hidden="true"></i>{opponentDisplayLabel}</span>
      </div>
    </header>
  {/if}

  {#if words.length === 0}
    <p class="empty">{emptyText}</p>
  {:else}
    <div bind:this={wordsElement} class="words" on:scroll={updateScrollHint}>
      {#each words as item}
        <button
          class:both-found={showComparisonMarkers && item.found && item.opponentFound}
          class:found={!showComparisonMarkers && showFoundState && item.found}
          class:missed={showFoundState && !item.found && !(showComparisonMarkers && item.opponentFound)}
          class:opponent-found={showComparisonMarkers && item.opponentFound}
          class:self-found={showComparisonMarkers && item.found}
          class:with-markers={showComparisonMarkers}
          class="word-row"
          type="button"
          on:click={() => onWordSelect(item.word)}
        >
          <span>{item.word}</span>
          {#if showComparisonMarkers}
            <span class="word-markers" aria-label={getComparisonLabel(item)}>
              <i class:active={item.found} class="marker self" aria-hidden="true"></i>
              <i class:active={item.opponentFound} class="marker opponent" aria-hidden="true"></i>
            </span>
          {/if}
          <strong>{item.displayScore ?? item.score}</strong>
        </button>
      {/each}
    </div>
  {/if}
</section>

<style>
  .word-list {
    min-height: 0;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 0;
    background: var(--surface);
    box-shadow: var(--shadow-sm);
  }

  .word-list::after {
    content: "";
    position: absolute;
    top: 1px;
    right: 1px;
    bottom: 1px;
    z-index: 2;
    width: 2.35rem;
    border-radius: 0;
    background: linear-gradient(to right, transparent, var(--surface) 78%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 120ms ease;
  }

  .word-list.can-scroll-right::after {
    opacity: 1;
  }

  .word-list-header {
    flex: 0 0 auto;
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    align-items: center;
    gap: 0.65rem;
    padding: 0.55rem 0.6rem 0.4rem;
    border-bottom: 1px solid var(--border);
  }

  .word-list-header h2 {
    min-width: 0;
    margin: 0;
    font-size: 0.82rem;
    font-weight: 900;
    line-height: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .comparison-legend {
    min-width: 0;
    display: flex;
    justify-content: flex-end;
    gap: 0.55rem;
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 850;
    line-height: 1;
  }

  .comparison-legend span {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.24rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty {
    margin: 0;
    padding: 1rem;
    color: var(--muted);
    font-size: 0.92rem;
  }

  .words {
    flex: 1;
    min-height: 0;
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0.45rem;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: max-content;
    grid-template-rows: repeat(auto-fill, minmax(1.85rem, 1.85rem));
    align-content: start;
    justify-content: start;
    gap: 0.22rem 0.7rem;
  }

  .word-row {
    min-width: 0;
    height: 1.85rem;
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    align-items: center;
    justify-content: start;
    justify-self: stretch;
    gap: 0.36rem;
    padding: 0 0.36rem;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .word-row.with-markers {
    grid-template-columns: minmax(0, 1fr) max-content max-content;
    border-left: 3px solid transparent;
  }

  .word-row:hover {
    background: var(--surface-muted);
  }

  .word-row span {
    white-space: nowrap;
    font-size: 0.92rem;
  }

  .word-row strong {
    flex: 0 0 auto;
    justify-self: end;
    color: var(--muted);
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
  }

  .word-markers {
    display: grid;
    grid-template-columns: repeat(2, 0.58rem);
    align-items: center;
    gap: 0.16rem;
  }

  .marker {
    width: 0.56rem;
    height: 0.56rem;
    display: inline-block;
    border: 1px solid var(--border);
    background: transparent;
    opacity: 0.42;
  }

  .marker.self.active {
    border-color: var(--success);
    background: var(--success);
    opacity: 1;
  }

  .marker.opponent.active {
    border-color: var(--warning);
    background: var(--warning);
    opacity: 1;
  }

  .word-row.with-markers.self-found {
    border-left-color: var(--success);
    background: color-mix(in srgb, var(--success) 13%, transparent);
    color: var(--ink);
    font-weight: 750;
  }

  .word-row.with-markers.opponent-found {
    border-left-color: var(--warning);
    background: color-mix(in srgb, var(--warning) 15%, transparent);
    color: var(--ink);
  }

  .word-row.with-markers.both-found {
    border-left-color: var(--success);
    background:
      linear-gradient(
        90deg,
        color-mix(in srgb, var(--success) 17%, transparent),
        color-mix(in srgb, var(--warning) 13%, transparent)
      );
    color: var(--ink);
    font-weight: 750;
  }

  .word-row.with-markers.self-found strong {
    color: var(--success);
  }

  .word-row.with-markers.opponent-found:not(.self-found) strong {
    color: var(--warning);
  }

  .word-row.found {
    background: var(--success);
    color: white;
    font-weight: 750;
  }

  .word-row.found strong {
    color: white;
  }

  .word-row.found:hover {
    background: var(--accent-strong);
  }

  .word-row.missed {
    color: var(--muted);
  }
</style>
